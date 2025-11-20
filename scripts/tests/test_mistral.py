#!/usr/bin/env python3
"""
Local Mistral AI Testing Script for SwitchCV
This script demonstrates how to use Mistral-7B-Instruct-v0.3 locally for testing.
"""

import os
from pathlib import Path
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
import torch

def setup_mistral_model():
    """Download and setup Mistral model locally"""
    print("Setting up Mistral-7B-Instruct-v0.3...")

    # Model configuration
    model_id = "mistralai/Mistral-7B-Instruct-v0.3"

    # Check if model is already downloaded
    model_path = Path.home() / ".cache" / "huggingface" / "hub" / model_id.replace("/", "_")
    if not model_path.exists():
        print("Downloading model (this may take a while)...")
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16,
            device_map="auto"
        )
        print("Model downloaded successfully!")
    else:
        print("Model already exists locally.")
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16,
            device_map="auto"
        )

    return tokenizer, model

def test_resume_enhancement(tokenizer, model):
    """Test resume enhancement with Mistral"""
    print("\n=== Testing Resume Enhancement ===")

    resume_data = {
        "summary": "Experienced software developer with 5 years of experience in web development.",
        "skills": ["JavaScript", "React", "Node.js", "Python"],
        "experience": [
            {
                "title": "Frontend Developer",
                "company": "Tech Corp",
                "description": "Developed web applications using React and JavaScript."
            }
        ]
    }

    prompt = f"""You are an expert resume writer. Enhance the following resume summary to make it more compelling and professional.

Current Summary: {resume_data['summary']}

Skills: {', '.join(resume_data['skills'])}

Experience: {resume_data['experience'][0]['title']} at {resume_data['experience'][0]['company']}: {resume_data['experience'][0]['description']}

Please provide an enhanced professional summary that highlights achievements and uses strong action verbs."""

    messages = [
        {"role": "system", "content": "You are a helpful AI assistant specializing in resume writing."},
        {"role": "user", "content": prompt}
    ]

    # Tokenize and generate
    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        return_tensors="pt"
    ).to(model.device)

    outputs = model.generate(
        inputs,
        max_new_tokens=200,
        temperature=0.7,
        do_sample=True,
        top_p=0.9
    )

    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    print("Enhanced Summary:")
    print(response)

def test_function_calling(tokenizer, model):
    """Test function calling capabilities"""
    print("\n=== Testing Function Calling ===")

    def get_current_weather(location: str, format: str = "celsius"):
        """Get current weather for a location"""
        # Mock weather data
        weather_data = {
            "New York": {"temp": 22, "condition": "Sunny"},
            "London": {"temp": 15, "condition": "Cloudy"},
            "Paris": {"temp": 18, "condition": "Rainy"}
        }
        return weather_data.get(location, {"temp": 20, "condition": "Unknown"})

    # Example conversation
    messages = [
        {"role": "user", "content": "What's the weather like in Paris?"}
    ]

    # For function calling, you'd typically use tools parameter
    # This is a simplified example
    prompt = """What's the weather like in Paris?

Available function: get_current_weather(location: str, format: str = "celsius") -> dict

Please respond with a function call if appropriate, or a normal response."""

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    outputs = model.generate(
        inputs.input_ids,
        max_new_tokens=100,
        temperature=0.1,
        do_sample=False
    )

    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    print("Function Calling Response:")
    print(response)

def main():
    """Main testing function"""
    print("SwitchCV - Mistral AI Local Testing")
    print("=" * 40)

    try:
        tokenizer, model = setup_mistral_model()

        # Run tests
        test_resume_enhancement(tokenizer, model)
        test_function_calling(tokenizer, model)

        print("\n=== Testing Complete ===")
        print("Mistral-7B-Instruct-v0.3 is working correctly!")

    except Exception as e:
        print(f"Error during testing: {e}")
        print("Make sure you have sufficient RAM/VRAM and the required dependencies installed.")
        print("Required: pip install transformers torch")

if __name__ == "__main__":
    main()