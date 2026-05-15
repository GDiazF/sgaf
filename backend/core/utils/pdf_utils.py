import os
import subprocess
import tempfile
import logging
import shutil
from django.conf import settings

logger = logging.getLogger(__name__)

def compress_pdf(input_path, quality_level=3):
    """
    Compresses a PDF using Ghostscript.
    """
    if not input_path or not os.path.exists(input_path):
        return False

    if not input_path.lower().endswith('.pdf'):
        return False

    quality = {
        1: '/prepress',
        2: '/printer',
        3: '/ebook',
        4: '/screen'
    }

    # Detect Ghostscript command
    gs_cmd = 'gs'
    
    # Try 'gs' (Linux/WSL/Some Windows installs)
    try:
        subprocess.run(['gs', '--version'], capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        # Try 'gswin64c' (Standard 64-bit Windows install)
        try:
            subprocess.run(['gswin64c', '--version'], capture_output=True, check=True)
            gs_cmd = 'gswin64c'
        except (FileNotFoundError, subprocess.CalledProcessError):
            # Try to find it in common Program Files paths using glob
            import glob
            gs_bin_paths = glob.glob(r"C:\Program Files\gs\gs*\bin\gswin64c.exe")
            
            if gs_bin_paths:
                # Sort to get the latest version if multiple exist
                gs_bin_paths.sort(reverse=True)
                gs_cmd = gs_bin_paths[0]
                found = True
            
            if not found:
                logger.error("Ghostscript not found. Please add it to PATH.")
                return False

    # Create a temporary file for the output
    fd, temp_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)

    gs_command = [
        gs_cmd,
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        f'-dPDFSETTINGS={quality.get(quality_level, "/ebook")}',
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        '-dDetectDuplicateImages=true',
        '-dEmbedAllFonts=true',
        '-dSubsetFonts=true',
        f'-sOutputFile={temp_path}',
        input_path
    ]

    try:
        subprocess.run(gs_command, check=True)
        
        orig_size = os.path.getsize(input_path)
        comp_size = os.path.getsize(temp_path)
        
        if comp_size < orig_size and comp_size > 0:
            reduction = (1 - comp_size/orig_size) * 100
            logger.info(f"PDF compressed: {os.path.basename(input_path)} | {orig_size/1024:.1f}KB -> {comp_size/1024:.1f}KB ({reduction:.1f}% reduction)")
            shutil.copy2(temp_path, input_path)
            return True
        return False
            
    except subprocess.CalledProcessError as e:
        logger.error(f"Ghostscript error: {e.stderr if hasattr(e, 'stderr') else str(e)}")
    except FileNotFoundError:
        logger.error("Ghostscript (gs) is not installed on the system. Run 'sudo apt install ghostscript'")
    except Exception as e:
        logger.error(f"Unexpected error compressing PDF: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
    return False
