FROM codercom/code-server:latest

# Install Node.js and npm
RUN sudo apt-get update && \
    sudo apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && \
    sudo apt-get install -y nodejs && \
    sudo npm install -g npm@10.2.4

# Create project directory
RUN mkdir -p /home/coder/project/vue-app

WORKDIR /home/coder/project/vue-app

# Initialize package.json and install Vue dependencies
RUN npm init -y && \
    npm install vue@latest vue-router@4 pinia@latest typescript@latest vite@latest @vitejs/plugin-vue@latest && \
    npm install -D @vue/compiler-sfc @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint prettier eslint-plugin-vue

# Create basic Vue project structure
COPY template/* ./

# Install VS Code extensions
RUN code-server --install-extension Vue.volar || true && \
    code-server --install-extension Vue.vscode-typescript-vue-plugin || true && \
    code-server --install-extension dbaeumer.vscode-eslint || true && \
    code-server --install-extension esbenp.prettier-vscode || true

# Set default shell to bash
ENV SHELL=/bin/bash

# Configure git to suppress warnings
RUN git config --global init.defaultBranch main && \
    git config --global user.email "user@example.com" && \
    git config --global user.name "Code Server User"

# Expose ports for code-server and Vue dev server
EXPOSE 8080 5173 