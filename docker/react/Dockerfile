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
    echo "auth: none\nbind-addr: 0.0.0.0:8080\ncert: false" > /home/coder/.config/code-server/config.yaml

# Expose the default code-server port
EXPOSE 8080

# Start code-server
CMD ["code-server", "--auth", "none", "--bind-addr", "0.0.0.0:8080", "."] 