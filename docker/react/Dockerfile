FROM codercom/code-server:latest

# Install Node.js and npm
RUN sudo apt-get update && \
    sudo apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && \
    sudo apt-get install -y nodejs

# Create workspace directory
WORKDIR /home/coder/project

# Create a new React project using Vite
RUN npm create vite@latest my-react-app -- --template react && \
    cd my-react-app && \
    npm install

# Set working directory to the React project
WORKDIR /home/coder/project/my-react-app

# Install VS Code extensions for React development
RUN code-server --install-extension dsznajder.es7-react-js-snippets && \
    code-server --install-extension esbenp.prettier-vscode && \
    code-server --install-extension dbaeumer.vscode-eslint

# Configure code-server to run without authentication
RUN mkdir -p /home/coder/.config/code-server && \
    echo "bind-addr: 0.0.0.0:8080\nauth: none\nsecurity.workspace.trust.enabled: false\ncert: false" > /home/coder/.config/code-server/config.yaml && \
    mkdir -p /home/coder/bin && \
    echo '#!/bin/sh\nexec code-server --auth none --disable-telemetry --disable-update-check --bind-addr 0.0.0.0:8080 "$@"' > /home/coder/bin/entrypoint.sh && \
    chmod +x /home/coder/bin/entrypoint.sh

# Expose the default code-server port
EXPOSE 8080

# Set environment variables
ENV CS_DISABLE_AUTH=true \
    CS_AUTH=none \
    PASSWORD= \
    PATH="/home/coder/bin:${PATH}"

# Start code-server with explicit no authentication
ENTRYPOINT ["/home/coder/bin/entrypoint.sh", "--auth", "none", "--bind-addr", "0.0.0.0:8080", "--disable-telemetry", "--disable-update-check", "."] 