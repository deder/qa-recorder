# -*- coding: utf-8 -*-
# Sidecar de transcription (faster-whisper) — moteur de DEV.
# La cible distribuable est whisper.cpp (jalon J4) ; ce script sert quand
# whisper.cpp n'est pas embarqué mais que faster-whisper est installé.
# Usage: python transcribe_fw.py <audio.wav> <out.txt> <model> <device> <compute_type>
import os, sys

def add_nvidia_dlls():
    try:
        import importlib.util
        spec = importlib.util.find_spec("nvidia")
        if not spec or not spec.submodule_search_locations:
            return
        root = list(spec.submodule_search_locations)[0]
        for sub in ("cublas", "cudnn"):
            binp = os.path.join(root, sub, "bin")
            if os.path.isdir(binp):
                os.add_dll_directory(binp)
                os.environ["PATH"] = binp + os.pathsep + os.environ.get("PATH", "")
    except Exception:
        pass

def main():
    audio = sys.argv[1]
    out = sys.argv[2]
    model_name = sys.argv[3] if len(sys.argv) > 3 else "large-v3"
    device = sys.argv[4] if len(sys.argv) > 4 else "cpu"
    compute = sys.argv[5] if len(sys.argv) > 5 else "int8"

    if device == "cuda":
        add_nvidia_dlls()

    from faster_whisper import WhisperModel

    try:
        model = WhisperModel(model_name, device=device, compute_type=compute)
    except Exception as e:
        sys.stderr.write(f"model load failed ({e}); fallback CPU int8\n")
        model = WhisperModel(model_name if model_name != "large-v3" else "large-v3", device="cpu", compute_type="int8")

    segments, info = model.transcribe(audio, language="fr", beam_size=5, vad_filter=True,
                                      vad_parameters=dict(min_silence_duration_ms=500))

    def ts(s):
        h = int(s // 3600); m = int((s % 3600) // 60); sec = int(s % 60); ms = int(round((s - int(s)) * 1000))
        return f"{h:02d}:{m:02d}:{sec:02d}.{ms:03d}"

    # Progression = secondes d'audio transcrites / durée totale (monotone).
    # NB: si une 2e passe est ajoutée un jour, encadrer ce calcul par (passe-1 + frac)/nb_passes.
    total = info.duration or 0.0
    n = 0
    last = 0.0
    with open(out, "w", encoding="utf-8") as f:
        for seg in segments:
            f.write(f"[{ts(seg.start)} -> {ts(seg.end)}] {seg.text.strip()}\n")
            n += 1
            if seg.end - last >= 1.0:
                last = seg.end
                sys.stdout.write(f"PROGRESS {seg.end:.2f} {total:.2f}\n")
                sys.stdout.flush()
    sys.stdout.write(f"DONE {n}\n")

if __name__ == "__main__":
    main()
