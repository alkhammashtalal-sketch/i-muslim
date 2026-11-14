#!/usr/bin/env python3
"""«نغمة هادئة» (add-on 0072-add18 §1): the prayer alert's calm tone, made here in code (our own work, no recording,
no licence of anyone else; docs/COMPONENTS.csv). Three soft bell-like notes falling gently (E5, B4, E4), each a sine
with two quiet overtones, a 20 ms rise and a long decay, then silence: 7 seconds, far under Apple's 30-second limit
for a notification sound. Peak at -12 dBFS, so it is never loud.

  python3 web/scripts/make-calm-tone.py           # writes the two files below
  web/ios/App/App/muslim-calm.caf                  IMA4 in CAF (afconvert), a format UNNotificationSound plays
  web/android/app/src/main/res/raw/muslim_calm.wav 16-bit PCM WAV, the Android channel's sound
"""
import math
import os
import struct
import subprocess
import sys
import tempfile
import wave

RATE = 22050
SECONDS = 7.0
PEAK = 10 ** (-12 / 20)
# (start s, frequency Hz, loudness): E5, B4, E4.
NOTES = [(0.0, 659.25, 1.0), (1.1, 493.88, 0.85), (2.2, 329.63, 0.8)]
OVERTONES = [(1.0, 1.0), (2.0, 0.22), (3.0, 0.06)]
DECAY = 1.5   # seconds to fall to 1/e
RISE = 0.02


def samples():
    n = int(RATE * SECONDS)
    out = [0.0] * n
    for start, f, amp in NOTES:
        s0 = int(start * RATE)
        for i in range(s0, n):
            t = (i - s0) / RATE
            env = (min(1.0, t / RISE)) * math.exp(-t / DECAY)
            if t > RISE and env < 1e-4:
                break
            v = sum(a * math.sin(2 * math.pi * f * k * t) for k, a in OVERTONES)
            out[i] += amp * env * v
    # The last half second fades to silence.
    fade = int(0.5 * RATE)
    for j in range(fade):
        out[n - fade + j] *= 1 - j / fade
    top = max(abs(x) for x in out)
    return [x / top * PEAK for x in out]


def write_wav(path, xs):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(round(x * 32767))) for x in xs))


def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    xs = samples()
    android = os.path.join(root, 'android/app/src/main/res/raw/muslim_calm.wav')
    os.makedirs(os.path.dirname(android), exist_ok=True)
    write_wav(android, xs)
    ios = os.path.join(root, 'ios/App/App/muslim-calm.caf')
    with tempfile.TemporaryDirectory() as d:
        src = os.path.join(d, 'calm.wav')
        write_wav(src, xs)
        subprocess.run(['afconvert', src, ios, '-d', 'ima4', '-f', 'caff'], check=True)
    print(android)
    print(ios)


if __name__ == '__main__':
    sys.exit(main())
