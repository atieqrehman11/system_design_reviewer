"""
Setup script for SystemDesignMentor backend
"""

from setuptools import setup, find_packages

setup(
    name="system-design-mentor-backend",
    version="1.0.0",
    description="AI-powered architecture analysis backend",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "fastapi>=0.104.1",
        "uvicorn[standard]>=0.24.0",
        "crewai[tools]>=1.7.2",
        "pydantic>=2.5.0",
        "python-multipart>=0.0.6",
    ],
)