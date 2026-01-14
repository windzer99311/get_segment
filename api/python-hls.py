from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import subprocess
import os
import tempfile
import zipfile
import shutil
from pathlib import Path

app = FastAPI()
