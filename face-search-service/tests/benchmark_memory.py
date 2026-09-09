"""python tests/benchmark_memory.py caminho/selfie.jpg (não grava selfie/embedding)."""
import os
from pathlib import Path
import sys
import time
import json

for name in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[name] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def peak_mib():
    if os.name == "nt":
        import ctypes
        from ctypes import wintypes
        class Counters(ctypes.Structure):
            _fields_ = [("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD),
                        ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
                        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
                        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t), ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                        ("PagefileUsage", ctypes.c_size_t), ("PeakPagefileUsage", ctypes.c_size_t)]
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.GetCurrentProcess.restype = wintypes.HANDLE
        psapi = ctypes.WinDLL("psapi", use_last_error=True)
        psapi.GetProcessMemoryInfo.argtypes = [wintypes.HANDLE, ctypes.POINTER(Counters), wintypes.DWORD]
        counters = Counters()
        counters.cb = ctypes.sizeof(counters)
        if not psapi.GetProcessMemoryInfo(kernel.GetCurrentProcess(), ctypes.byref(counters), counters.cb):
            raise ctypes.WinError(ctypes.get_last_error())
        return counters.PeakWorkingSetSize / (1024 * 1024)
    import resource
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return peak / (1024 * 1024 if sys.platform == "darwin" else 1024)


def main():
    import numpy as np
    # Inclui o overhead do servidor e do parser, além do modelo.
    import app.main
    from app.config import MAX_INDEX_FACES, MATCH_THRESHOLD, MAX_UPLOAD_BYTES
    from app.face_service import FaceService, FaceIndex, load_image
    image_path = Path(sys.argv[1])
    service = FaceService()
    for session in (service.detector.session, service.recognizer.session):
        options = session.get_session_options()
        assert options.intra_op_num_threads == 1
        assert not options.enable_cpu_mem_arena
        assert not options.enable_mem_pattern
        assert session.get_providers() == ["CPUExecutionProvider"]
    embedding = service.selfie_embedding(load_image(image_path))
    index = FaceIndex(np.tile(embedding, (MAX_INDEX_FACES, 1)), ["benchmark.jpg"] * MAX_INDEX_FACES)
    timings = []
    for _ in range(5):
        # Pior caso de upload: arquivo JPEG com preenchimento até o limite aceito.
        data = bytearray(image_path.read_bytes())
        if len(data) > MAX_UPLOAD_BYTES:
            raise ValueError("Imagem de teste maior que o upload permitido.")
        data.extend(b"\0" * (MAX_UPLOAD_BYTES - len(data)))
        start = time.perf_counter()
        result = app.main.search_image(data, service, index)
        timings.append(round(time.perf_counter() - start, 3))
        assert result["count"] == 1
    result = {"platform": sys.platform, "python": sys.version.split()[0],
              "indexed_faces": MAX_INDEX_FACES, "upload_mib": MAX_UPLOAD_BYTES / 1024**2,
              "peak_process_mib": round(peak_mib(), 1), "search_seconds": timings}
    print(json.dumps(result, indent=2))
    if result["peak_process_mib"] >= 450:
        raise SystemExit("Pico >= 450 MiB: margem insuficiente para recomendar 512 MB.")


if __name__ == "__main__":
    main()
