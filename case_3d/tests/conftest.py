import sys
from pathlib import Path

# The 3D scripts live one level up and are run as plain scripts, not as a package.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
