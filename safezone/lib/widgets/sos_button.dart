import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme.dart';

/// The emergency button. **Double-tap to fire, not a single tap** — a pocket
/// brush or a fumbled thumb must never raise a real alarm to the embassy. The
/// first tap arms the button; a second tap within a short window commits, so
/// the double-tap is itself the confirmation and there is no dialog to slow a
/// genuine emergency.
class SosButton extends StatefulWidget {
  /// Called once the user has double-tapped to commit.
  final VoidCallback onTriggered;

  const SosButton({super.key, required this.onTriggered});

  @override
  State<SosButton> createState() => _SosButtonState();
}

class _SosButtonState extends State<SosButton> with TickerProviderStateMixin {
  /// The idle attention pulse.
  late final AnimationController _pulse;

  /// Counts down the window to land the second tap. Drains from 1 → 0; if it
  /// reaches 0 the button disarms without firing.
  late final AnimationController _armWindow;

  /// How long after the first tap the second tap must land. Long enough to be a
  /// deliberate double-tap, short enough that two unrelated grazes can't chain.
  static const Duration _armWindowDuration = Duration(milliseconds: 2000);

  bool _reduceMotion = false;
  bool _armed = false;

  @override
  void initState() {
    super.initState();
    _pulse =
        AnimationController(vsync: this, duration: SafeZoneTokens.durationPulse);
    _armWindow = AnimationController(
      vsync: this,
      duration: _armWindowDuration,
      value: 1.0,
    )..addStatusListener((status) {
        // Window drained to empty → the first tap lapsed, stand down.
        if (status == AnimationStatus.dismissed && _armed) {
          setState(() => _armed = false);
        }
      });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // A large repeating red animation is a photosensitivity/vestibular hazard;
    // if the platform asks for reduced motion, the ring holds still.
    _reduceMotion = MediaQuery.disableAnimationsOf(context);
    if (_reduceMotion) {
      _pulse.stop();
      _pulse.value = 0;
    } else if (!_pulse.isAnimating) {
      _pulse.repeat();
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    _armWindow.dispose();
    super.dispose();
  }

  void _onTap() {
    if (_armed) {
      // Second tap inside the window → fire.
      _armWindow.stop();
      setState(() => _armed = false);
      HapticFeedback.heavyImpact();
      widget.onTriggered();
    } else {
      // First tap → arm and start draining the window.
      setState(() => _armed = true);
      HapticFeedback.selectionClick();
      _armWindow.reverse(from: 1.0);
    }
  }

  @override
  Widget build(BuildContext context) {
    const double buttonSize = 180.0;
    final tokens = context.tokens;
    final colors = context.colors;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Semantics(
            button: true,
            label: 'ກົດສອງຄັ້ງເພື່ອສົ່ງສັນຍານສຸກເສີນ',
            child: GestureDetector(
              onTap: _onTap,
              child: SizedBox(
                width: buttonSize * 1.5,
                height: buttonSize * 1.5,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Idle pulse — hidden while armed and under reduced motion.
                    if (!_reduceMotion)
                      AnimatedBuilder(
                        animation: Listenable.merge([_pulse, _armWindow]),
                        builder: (context, child) {
                          if (_armed) return const SizedBox.shrink();
                          final scale = 1.0 + (_pulse.value * 0.5);
                          final opacity = 0.35 * (1.0 - _pulse.value);
                          return Container(
                            width: buttonSize,
                            height: buttonSize,
                            transform:
                                Matrix4.diagonal3Values(scale, scale, 1.0),
                            transformAlignment: Alignment.center,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: tokens.critical
                                  .withAlpha((opacity * 255).round()),
                            ),
                          );
                        },
                      ),

                    // Flat outer rule. Structure is a line, not a shadow.
                    Container(
                      width: buttonSize + 16,
                      height: buttonSize + 16,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: colors.outlineVariant,
                          width: SafeZoneTokens.ruleHair,
                        ),
                      ),
                    ),

                    // Arm-window ring — drains while waiting for the second tap.
                    AnimatedBuilder(
                      animation: _armWindow,
                      builder: (context, child) {
                        if (!_armed) return const SizedBox.shrink();
                        return SizedBox(
                          width: buttonSize + 16,
                          height: buttonSize + 16,
                          child: CircularProgressIndicator(
                            value: _armWindow.value,
                            strokeWidth: 6,
                            backgroundColor: Colors.transparent,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(tokens.onCritical),
                          ),
                        );
                      },
                    ),

                    // The button itself: a round, thumb-sized panic target.
                    Container(
                      width: buttonSize,
                      height: buttonSize,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: tokens.critical,
                      ),
                      child: Center(
                        child: Text(
                          'SOS',
                          style: TextStyle(
                            color: tokens.onCritical,
                            fontSize: 40,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _armed
                ? 'ກົດອີກຄັ້ງເພື່ອຢືນຢັນ'
                : 'ກົດສອງຄັ້ງເພື່ອສົ່ງສັນຍານສຸກເສີນ',
            textAlign: TextAlign.center,
            style: context.text.bodyMedium,
          ),
        ],
      ),
    );
  }
}
