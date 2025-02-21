const Docker = require("dockerode");
const { exec } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const execAsync = promisify(exec);

// Keep track of running containers
const activeContainers = new Map();

// Add template-specific configurations
const templateConfig = {
  react: {
    folderName: "my-react-app",
    workDir: "/home/coder/project/my-react-app",
  },
  node: {
    folderName: "node-app",
    workDir: "/home/coder/project/node-app",
  },
  python: {
    folderName: "python-app",
    workDir: "/home/coder/project/python-app",
  },
  vue: {
    folderName: "vue-app",
    workDir: "/home/coder/project/vue-app",
  },
};

// Function to check Docker connection
async function checkDockerConnection() {
  try {
    const docker = new Docker({
      socketPath: "/var/run/docker.sock",
      host: null,
    });

    // Test connection and get Docker info
    const info = await docker.info();
    console.log(
      "Docker connection successful. Server version:",
      info.ServerVersion
    );

    // Test image listing to verify API access
    const images = await docker.listImages();
    console.log("Successfully listed images. Count:", images.length);

    return docker;
  } catch (error) {
    console.error("Docker connection error:", {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    });

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
    const config = templateConfig[template];

    if (!config) {
      throw new Error(`Invalid template: ${template}`);
    }

    // Check and build image if needed
    await ensureImageExists(template);

    // Create and start container
    const container = await createContainer(imageName, port, config);
    await container.start();

    // Wait for container to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Store container info
    const containerInfo = {
      template,
      port,
      startTime: new Date(),
      containerId: container.id,
      workDir: config.workDir,
    };
    activeContainers.set(container.id, containerInfo);

    // Return editor URL with template-specific folder
    const url = `http://localhost:${port}/?folder=${config.workDir}&autostart=1`;
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
  let buildOutput = "";

  async function verifyImage() {
    try {
      console.log(`Attempting to verify image: ${imageName}`);

      // Get all images including intermediates
      const allImages = await docker.listImages({ all: true });
      console.log(
        "All images (including intermediates):",
        allImages.map((img) => ({
          RepoTags: img.RepoTags || [],
          Id: img.Id,
          Created: new Date(img.Created * 1000).toISOString(),
        }))
      );

      // Look for our image by tag first
      let foundImage = allImages.find(
        (img) => img.RepoTags && img.RepoTags.includes(imageName)
      );

      if (!foundImage && buildOutput) {
        // Try to parse the build output to get the image ID
        const buildOutputMatch = /writing image sha256:([a-f0-9]+)/.exec(
          buildOutput
        );
        if (buildOutputMatch) {
          const builtImageId = `sha256:${buildOutputMatch[1]}`;
          console.log(
            "Looking for image with ID from build output:",
            builtImageId
          );

          // Try direct inspection first
          try {
            const inspectedImage = await docker
              .getImage(builtImageId)
              .inspect();
            console.log("Found image by direct ID inspection:", {
              id: inspectedImage.Id,
              repoTags: inspectedImage.RepoTags,
              created: inspectedImage.Created,
            });
            foundImage = { Id: builtImageId };
          } catch (inspectError) {
            console.log("Direct inspection failed:", inspectError.message);
            // Fall back to searching in list
            foundImage = allImages.find((img) => img.Id === builtImageId);
          }
        }
      }

      if (!foundImage) {
        // Try one last direct inspection of the image by name
        try {
          const inspectedImage = await docker.getImage(imageName).inspect();
          console.log("Found image by direct name inspection:", {
            id: inspectedImage.Id,
            repoTags: inspectedImage.RepoTags,
            created: inspectedImage.Created,
          });
          foundImage = { Id: inspectedImage.Id };
        } catch (inspectError) {
          console.log("Direct name inspection failed:", inspectError.message);
          console.log(
            `Image ${imageName} not found in ${allImages.length} images`
          );
          return false;
        }
      }

      // Try to tag the image if needed
      if (!foundImage.RepoTags?.includes(imageName)) {
        console.log(
          `Image found but missing tag ${imageName}, attempting to tag it...`
        );
        try {
          const image = docker.getImage(foundImage.Id);
          await image.tag({ repo: `code-server-${template}`, tag: "latest" });
          console.log("Successfully tagged image");

          // Verify the tag was applied
          const taggedImage = await image.inspect();
          console.log("Tagged image verification:", {
            id: taggedImage.Id,
            repoTags: taggedImage.RepoTags,
          });
        } catch (tagError) {
          console.error("Error tagging image:", tagError);
        }
      }

      return true;
    } catch (error) {
      console.error("Image verification error:", error);
      return false;
    }
  }

  // First try to verify existing image
  if (await verifyImage()) {
    console.log(`✅ Image ${imageName} found and verified locally`);
    return;
  }

  // Force rebuild if verification fails
  console.log(`Image ${imageName} not found locally, forcing rebuild...`);
  try {
    const projectRoot = path.resolve(__dirname, "../../../");
    const templateDir = path.join(projectRoot, "docker/templates", template);

    console.log("Building with paths:", {
      projectRoot,
      templateDir,
      currentDir: __dirname,
    });

    // Verify template directory exists
    const { stdout: lsOutput } = await execAsync(`ls -la "${templateDir}"`);
    console.log(`Template directory contents:`, lsOutput);

    // Build using Docker API directly
    console.log(`Building image ${imageName} from ${templateDir}...`);

    const stream = await docker.buildImage(
      {
        context: templateDir,
        src: ["Dockerfile", "template/"],
      },
      {
        t: imageName,
        forcerm: true,
        nocache: true,
        dockerfile: "Dockerfile",
      }
    );

    // Collect build output
    let buildLogs = "";
    await new Promise((resolve, reject) => {
      docker.modem.followProgress(
        stream,
        (err, res) => (err ? reject(err) : resolve(res)),
        (event) => {
          if (event.stream) {
            buildLogs += event.stream;
            console.log("Build progress:", event.stream.trim());
          }
        }
      );
    });

    buildOutput = buildLogs;
    console.log("Build completed. Full logs:", buildLogs);

    // Wait for image with retries
    for (let i = 0; i < maxRetries; i++) {
      console.log(`Verifying image build (attempt ${i + 1}/${maxRetries})...`);
      if (await verifyImage()) {
        console.log(`Image ${imageName} successfully verified`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    throw new Error(`Image verification failed after ${maxRetries} attempts`);
  } catch (buildError) {
    console.error("Failed to build image:", {
      error: buildError.message,
      stack: buildError.stack,
      stdout: buildOutput,
    });
    throw new Error(
      `Failed to build ${template} template: ${buildError.message}`
    );
  }
}

async function createContainer(imageName, port, config) {
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
    WorkingDir: config.workDir,
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
