# Installation Guide

## Prerequisites

- Python 3.8 or higher
- Git
- Virtual environment tool (venv or virtualenv)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/AnilAlapati/switchCV.git
cd switchCV
```

### 2. Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
# Install required packages
pip install -r requirements.txt

# For development dependencies
pip install -r requirements-dev.txt
```

### 4. Verify Installation

```bash
# Run a quick test
python -c "import switchcv; print('Installation successful!')"
```

## Troubleshooting

### Common Issues

1. **Virtual environment not activating**

   - Ensure you're using the correct activation command for your OS
   - Check that Python is installed and in your PATH

2. **Dependencies installation fails**

   - Update pip: `pip install --upgrade pip`
   - Check internet connection
   - Try installing packages individually

3. **Python version issues**
   - Check Python version: `python --version`
   - Ensure it's 3.8 or higher

## Next Steps

After installation, refer to the README.md for usage instructions.
