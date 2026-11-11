"""Musique de fond douce (nappe + piano), libre de droits, générée par calcul.
Usage : python3 musique.py sortie.wav [durée_en_secondes]"""
import sys, wave
import numpy as np

SR = 44100
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 131.0
rng = np.random.default_rng(7)

def hz(n): return 440.0 * 2 ** ((n - 69) / 12)   # note MIDI -> Hz

# Progression en Ré majeur : I - V - vi - IV (D, A, Bm, G), 8 s par accord
CHORDS = [
    [50, 57, 62, 66, 69],   # D
    [45, 57, 61, 64, 69],   # A
    [47, 54, 59, 62, 66],   # Bm
    [43, 55, 59, 62, 67],   # G
]
BAR = 8.0
n = int(SR * (DUR + 6))
t = np.arange(n) / SR
L = np.zeros(n); R = np.zeros(n)

def env(length, a, r):
    e = np.ones(length)
    ai, ri = min(int(a * SR), length // 2), min(int(r * SR), length // 2)
    e[:ai] = np.linspace(0, 1, ai) ** 2
    e[-ri:] *= np.linspace(1, 0, ri) ** 2
    return e

# Nappe : chaque note = quelques harmoniques douces, légèrement désaccordées (largeur stéréo)
nb = int(np.ceil(DUR / BAR)) + 1
for b in range(nb):
    ch = CHORDS[b % 4]
    s0 = int(b * BAR * SR); length = int((BAR + 3) * SR)
    if s0 >= n: break
    length = min(length, n - s0)
    tt = np.arange(length) / SR
    e = env(length, 2.5, 3.5)
    for k, note in enumerate(ch):
        f = hz(note)
        for det, side in ((-0.12, 0), (0.12, 1)):
            ph = rng.uniform(0, 2 * np.pi)
            v = (np.sin(2*np.pi*(f+det)*tt + ph) + 0.25*np.sin(2*np.pi*2*(f+det)*tt + ph)
                 + 0.08*np.sin(2*np.pi*3*(f+det)*tt + ph))
            amp = (0.06 if k == 0 else 0.035) * e
            (L if side == 0 else R)[s0:s0+length] += v * amp

# Piano doux : arpège lent, 2 notes par mesure, une octave plus haut
def piano(f, length):
    tt = np.arange(length) / SR
    d = np.exp(-tt * 1.6)
    v = (np.sin(2*np.pi*f*tt) + 0.4*np.sin(2*np.pi*2*f*tt)*np.exp(-tt*3)
         + 0.15*np.sin(2*np.pi*3*f*tt)*np.exp(-tt*5))
    a = np.minimum(1, tt / 0.008)
    return v * d * a

for b in range(nb):
    if b < 1: continue                          # le piano entre après la 1re mesure
    ch = CHORDS[b % 4]
    picks = [ch[2] + 12, ch[3] + 12, ch[4] + 12, ch[3] + 12]
    for i, note in enumerate(picks):
        s0 = int((b * BAR + i * 2.0 + rng.uniform(0, .05)) * SR)
        length = int(4 * SR)
        if s0 + length > n: continue
        p = piano(hz(note), length) * 0.05
        pan = 0.5 + 0.3 * np.sin(i + b)
        L[s0:s0+length] += p * (1 - pan); R[s0:s0+length] += p * pan

# Réverbération : convolution avec une queue de bruit qui décroît
def reverb(x, secs=3.0, seed=1):
    r = np.random.default_rng(seed)
    m = int(secs * SR)
    ir = r.standard_normal(m) * np.exp(-np.arange(m) / SR * 2.2)
    ir[0] = 0
    N = 1 << int(np.ceil(np.log2(len(x) + m)))
    y = np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(ir, N), N)[:len(x)]
    return y / np.max(np.abs(y)) * np.max(np.abs(x))

L = 0.65 * L + 0.35 * reverb(L, seed=1)
R = 0.65 * R + 0.35 * reverb(R, seed=2)

out = np.stack([L, R], 1)[:int(DUR * SR)]
fade_in, fade_out = int(3 * SR), int(5 * SR)
out[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
out[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None] ** 1.5
out = out / np.max(np.abs(out)) * 0.8
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print('OK', sys.argv[1], DUR, 's')
