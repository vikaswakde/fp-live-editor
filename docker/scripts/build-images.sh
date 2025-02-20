#!/bin/bash

# Get the absolute path to the project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

# Function to check if image exists
check_image() {
    docker image inspect "code-server-$1:latest" >/dev/null 2>&1
    return $?
}

# Function to build single image
build_image() {
    local template=$1
    echo "Building code-server-$template image..."
    docker build -t "code-server-$template:latest" "$PROJECT_ROOT/docker/templates/$template"
    if [ $? -eq 0 ]; then
        echo "✅ Successfully built code-server-$template"
    else
        echo "❌ Failed to build code-server-$template"
        exit 1
    fi
}

# Available templates
templates=("react" "node" "python" "vue")

# Parse command line arguments
specific_template=""
force_rebuild=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--template)
            specific_template="$2"
            shift 2
            ;;
        -f|--force)
            force_rebuild=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [-t template_name] [-f]"
            exit 1
            ;;
    esac
done

# If specific template is provided
if [ ! -z "$specific_template" ]; then
    if [[ ! " ${templates[@]} " =~ " ${specific_template} " ]]; then
        echo "Error: Template '$specific_template' not found"
        echo "Available templates: ${templates[@]}"
        exit 1
    fi
    
    if ! check_image "$specific_template" || [ "$force_rebuild" = true ]; then
        build_image "$specific_template"
    else
        echo "Image code-server-$specific_template:latest already exists. Use -f to force rebuild."
    fi
    exit 0
fi

# Build all images if no specific template is provided
for template in "${templates[@]}"; do
    if ! check_image "$template" || [ "$force_rebuild" = true ]; then
        build_image "$template"
    else
        echo "Image code-server-$template:latest already exists. Use -f to force rebuild."
    fi
done

echo "✨ All requested images are ready!" 