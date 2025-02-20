const Docker = require("dockerode");
const { exec } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const execAsync = promisify(exec);

// Keep track of running containers
const activeContainers = new Map();

// Function to check Docker connection
async function checkDockerConnection() {
  try {
    const docker = new Docker({
      socketPath: "/var/run/docker.sock",
      host: null,
    });
    await docker.ping();
    return docker;
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      throw new Error(
        "Cannot connect to Docker. Please ensure Docker is running and you have proper permissions. Try:\n" +
          "1. Start Docker: sudo systemctl start docker\n" +
          "2. Add user to docker group: sudo usermod -aG docker $USER\n" +
          "3. Set permissions: sudo chmod 666 /var/run/docker.sock"
      );
    }
    throw error;
  }
}

// Configure Docker with explicit socket path
let docker;

async function startEditor(template) {
  console.log(`Starting template: ${template}`);

  try {
    // Ensure Docker connection
    docker = await checkDockerConnection();

    const port = 8000 + Math.floor(Math.random() * 1000);
    const imageName = `code-server-${template}:latest`;

    // Check and build image if needed
    await ensureImageExists(template);

    // Create and start container
    const container = await createContainer(imageName, port);
    await container.start();

    // Wait for container to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Store container info
    const containerInfo = {
      template,
      port,
      startTime: new Date(),
      containerId: container.id,
    };
    activeContainers.set(container.id, containerInfo);

    // Return editor URL
    const url = `http://localhost:${port}/?folder=/home/coder/project/my-react-app&autostart=1`;
    return { url };
  } catch (error) {
    console.error("Error starting editor:", error);
    throw new Error(`Failed to start ${template} editor: ${error.message}`);
  }
}

async function ensureImageExists(template) {
  const imageName = `code-server-${template}:latest`;
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  async function verifyImage() {
    try {
      const image = await docker.getImage(imageName).inspect();
      return image !== null;
    } catch (error) {
      return false;
    }
  }

  // First, check if image exists
  if (await verifyImage()) {
    console.log(`Image ${imageName} found locally`);
    return;
  }

  console.log(`Image ${imageName} not found locally, building...`);

  try {
    // Get project root directory
    const projectRoot = path.resolve(__dirname, "../../../");
    const buildScript = path.join(
      projectRoot,
      "docker/scripts/build-images.sh"
    );

    // Build specific template
    const { stdout, stderr } = await execAsync(`${buildScript} -t ${template}`);
    console.log("Build output:", stdout);
    if (stderr) console.error("Build stderr:", stderr);

    // Wait for image to be available with retries
    for (let i = 0; i < maxRetries; i++) {
      console.log(`Verifying image build (attempt ${i + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      if (await verifyImage()) {
        console.log(`Image ${imageName} successfully verified`);
        return;
      }
    }

    throw new Error(`Image verification failed after ${maxRetries} attempts`);
  } catch (buildError) {
    console.error("Failed to build image:", buildError);
    throw new Error(
      `Failed to build ${template} template: ${buildError.message}`
    );
  }
}

async function createContainer(imageName, port) {
  const containerConfig = {
    Image: imageName,
    ExposedPorts: {
      "8080/tcp": {},
    },
    HostConfig: {
      PortBindings: {
        "8080/tcp": [{ HostPort: port.toString() }],
      },
    },
    Env: [
      "CS_DISABLE_AUTH=true",
      "CS_AUTH=none",
      "PASSWORD=",
      "DOCKER_USER=coder",
      "CS_DISABLE_GETTING_STARTED_OVERRIDE=1",
      "CS_DISABLE_TELEMETRY=true",
      "CS_DISABLE_UPDATE_CHECK=true",
    ],
    Cmd: ["--auth=none", "--bind-addr=0.0.0.0:8080", "."],
    WorkingDir: "/home/coder/project/my-react-app",
    Tty: true,
    OpenStdin: true,
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
  };

  return await docker.createContainer(containerConfig);
}

function listContainers() {
  return Array.from(activeContainers.entries()).map(([id, info]) => ({
    id,
    ...info,
  }));
}

module.exports = {
  startEditor,
  listContainers,
};
