FROM codercom/code-server:latest

# Install Node.js and npm
RUN sudo apt-get update && \
    sudo apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && \
    sudo apt-get install -y nodejs && \
    sudo npm install -g npm@10.2.4

# Create project directory
RUN mkdir -p /home/coder/project/node-app

WORKDIR /home/coder/project/node-app

# Initialize a basic Node.js project
RUN npm init -y && \
    npm install express cors dotenv

# Create basic Express app structure
COPY ./template/* ./

# Install VS Code extensions
RUN code-server --install-extension dbaeumer.vscode-eslint && \
    code-server --install-extension esbenp.prettier-vscode && \
    code-server --install-extension christian-kohler.npm-intellisense

# Set default shell to bash
ENV SHELL=/bin/bash

# Expose port for code-server
EXPOSE 8080 