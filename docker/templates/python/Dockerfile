FROM codercom/code-server:latest

# Install Python and pip
RUN sudo apt-get update && \
    sudo apt-get install -y python3 python3-pip python3-venv

# Create project directory
RUN mkdir -p /home/coder/project/python-app

WORKDIR /home/coder/project/python-app

# Create and activate virtual environment
RUN python3 -m venv venv && \
    . venv/bin/activate && \
    pip install flask python-dotenv requests

# Copy template files
COPY ./template/* ./

# Install VS Code extensions (with error handling)
RUN code-server --install-extension ms-python.python || true && \
    code-server --install-extension ms-toolsai.jupyter || true && \
    code-server --install-extension njpwerner.autodocstring || true && \
    code-server --install-extension kevinrose.vsc-python-indent || true && \
    code-server --install-extension wholroyd.jinja || true

# Set default shell to bash
ENV SHELL=/bin/bash

# Add venv activation to bashrc
RUN echo "source /home/coder/project/python-app/venv/bin/activate" >> ~/.bashrc

# Expose port for code-server
EXPOSE 8080 