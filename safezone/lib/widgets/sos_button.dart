import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme.dart';

/// The emergency button. **Hold to fire, not tap** — a pocket brush or a
/// fumbled thumb must never raise a real alarm to the embassy, and the hold is
/// the confirmation, so there is no confirm dialog to slow a genuine emergency.
class SosButton extends StatefulWidget {
  /// Called once the user has held long enough to commit.
  final VoidCallback onTriggered;

  const SosButton({super.key, required this.onTriggered});

  @override
  State<SosButton> createState() => _SosButtonState();
}

class _SosButtonState extends State<SosButton> with TickerProviderStateMixin {
  /// The idle attention pulse.
  late final AnimationController _pulse;

  /// Fills while the button is held; firing at the end.
  late final AnimationController _hold;

  /// How long the user must hold. Long enough that a graze cannot reach it,
  /// short enough not to feel like a struggle when it matters.
  static const Duration _holdDuration = Duration(milliseconds: 1800);

  bool _reduceMotion = false;
  bool _fired = false;

  @override
  void initState() {
    super.initState();
    _pulse =
        AnimationController(vsync: this, duration: SafeZoneTokens.durationPulse);
    _hold = AnimationController(vsync: this, duration: _holdDuration)
      ..addStatusListener((status) {
        if (status == AnimationStatus.completed && !_fired) {
          _fired = true;
          HapticFeedback.heavyImpact();
          widget.onTriggered();
          _hold.reset();
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
    _hold.dispose();
    super.dispose();
  }

  void _onDown() {
    _fired = false;
    HapticFeedback.selectionClick();
    _hold.forward();
  }

  void _onRelease() {
    // Released before the ring filled → stand down, no alarm.
    if (_hold.status != AnimationStatus.completed && !_fired) {
      _hold.reverse();
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
            label: 'ກົດຄ້າງໄວ້ເພື່ອສົ່ງສັນຍານສຸກເສີນ',
            child: GestureDetector(
              onTapDown: (_) => _onDown(),
              onTapUp: (_) => _onRelease(),
              onTapCancel: _onRelease,
              child: SizedBox(
                width: buttonSize * 1.5,
                height: buttonSize * 1.5,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Idle pulse — hidden while holding and under reduced motion.
                    if (!_reduceMotion)
                      AnimatedBuilder(
                        animation: Listenable.merge([_pulse, _hold]),
                        builder: (context, child) {
                          if (_hold.value > 0) return const SizedBox.shrink();
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

                    // Hold-progress ring — fills as the user holds.
                    AnimatedBuilder(
                      animation: _hold,
                      builder: (context, child) {
                        if (_hold.value == 0) return const SizedBox.shrink();
                        return SizedBox(
                          width: buttonSize + 16,
                          height: buttonSize + 16,
                          child: CircularProgressIndicator(
                            value: _hold.value,
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
          AnimatedBuilder(
            animation: _hold,
            builder: (context, child) => Text(
              _hold.value > 0
                  ? 'ຄ້າງໄວ້... ປ່ອຍເພື່ອຍົກເລີກ'
                  : 'ກົດຄ້າງໄວ້ເພື່ອສົ່ງສັນຍານສຸກເສີນ',
              textAlign: TextAlign.center,
              style: context.text.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}
