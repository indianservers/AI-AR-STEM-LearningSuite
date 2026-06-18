// Feature 8: Haptic Feedback via Gamepad API vibration
export class HapticFeedback {
  constructor() {
    this._gamepad = null;
    this._poll();
  }

  _poll() {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gps) {
      if (gp && gp.hapticActuators?.length) { this._gamepad = gp; break; }
      if (gp && gp.vibrationActuator) { this._gamepad = gp; break; }
    }
    requestAnimationFrame(() => this._poll());
  }

  /** Pulse: grab feedback */
  grab() { this._vibrate(40, 0.3, 0); }

  /** Pulse: release feedback */
  release() { this._vibrate(25, 0.1, 0); }

  /** Pulse: select / click feedback */
  select() { this._vibrate(60, 0.5, 0); }

  /** Pulse: error / boundary */
  error() { this._vibrate(80, 0.8, 0.2); }

  /** Pulse: trophy unlock */
  trophy() { this._vibrate(120, 1.0, 0); }

  _vibrate(durationMs, intensity, weakIntensity) {
    const gp = this._gamepad;
    if (!gp) return;
    if (gp.vibrationActuator?.playEffect) {
      gp.vibrationActuator.playEffect('dual-rumble', {
        duration: durationMs,
        strongMagnitude: intensity,
        weakMagnitude: weakIntensity,
      }).catch(() => {});
    } else if (gp.hapticActuators?.[0]) {
      gp.hapticActuators[0].pulse(intensity, durationMs);
    }
  }
}
