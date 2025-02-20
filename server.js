const express = require("express");
const Docker = require("dockerode");
const cors = require("cors");
const path = require("path");

const app = express();

// Configure Docker with explicit socket path
const docker = new Docker({
  socketPath: "/var/run/docker.sock",
  host: null,
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Keep track of running containers
const activeContainers = new Map();

app.post("/start-editor", async (req, res) => {
  try {
    const { template } = req.body;
    console.log(`Starting template: ${template}`);

    // Generate a unique port for the container
    const port = 8000 + Math.floor(Math.random() * 1000);
    console.log(`Assigned port: ${port}`);

    const imageName = `code-server-${template}:latest`;
    console.log(`Looking for image: ${imageName}`);

    // Check if image exists
    try {
      await docker.getImage(imageName).inspect();
      console.log("Image found locally");
    } catch (error) {
      console.log("Image not found locally, attempting to build...");
      // Try to build the image
      try {
        const { exec } = require("child_process");
        await new Promise((resolve, reject) => {
          exec("sudo ./build-images.sh", (error, stdout, stderr) => {
            if (error) {
              console.error("Build error:", error);
              reject(error);
              return;
            }
            console.log("Build output:", stdout);
            if (stderr) console.error("Build stderr:", stderr);
            resolve();
          });
        });
      } catch (buildError) {
        console.error("Failed to build image:", buildError);
        throw new Error("Failed to build required image");
      }
    }

    // Create container based on template
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

    console.log(
      "Creating container with config:",
      JSON.stringify(containerConfig, null, 2)
    );

    const container = await docker.createContainer(containerConfig);
    console.log("Container created successfully");

    await container.start();
    console.log("Container started successfully");

    // Wait a bit for the container to fully start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get container info to verify it's running
    const containerInfo = await container.inspect();
    console.log("Container info:", JSON.stringify(containerInfo, null, 2));

    // Store container information
    activeContainers.set(container.id, {
      template,
      port,
      startTime: new Date(),
      containerId: container.id,
    });

    // Generate URL without any auth parameters
    const url = `http://localhost:${port}/?folder=/home/coder/project/my-react-app&autostart=1`;
    console.log("Editor URL:", url);

    // Return the URL to access the code-server
    res.json({ url });
  } catch (error) {
    console.error("Detailed error:", error);
    console.error("Error message:", error.message);
    if (error.json) console.error("Error JSON:", error.json);
    res.status(500).json({
      error: "Failed to start editor",
      details: error.message,
      json: error.json,
    });
  }
});

// Add endpoint to list active containers
app.get("/containers", (req, res) => {
  const containers = Array.from(activeContainers.entries()).map(
    ([id, info]) => ({
      id,
      ...info,
    })
  );
  res.json(containers);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
