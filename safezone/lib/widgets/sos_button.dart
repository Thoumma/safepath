import 'package:flutter/material.dart';
import '../theme.dart';

class SosButton extends StatefulWidget {
  final VoidCallback onTap;

  const SosButton({
    super.key,
    required this.onTap,
  });

  @override
  State<SosButton> createState() => _SosButtonState();
}

class _SosButtonState extends State<SosButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  /// A large, repeating, red animation next to the word "emergency" is a
  /// photosensitivity and vestibular hazard. If the platform asks for reduced
  /// motion, the ring holds still.
  bool _reduceMotion = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: SafeZoneTokens.durationPulse,
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduceMotion = MediaQuery.disableAnimationsOf(context);
    if (_reduceMotion) {
      _controller.stop();
      _controller.value = 0;
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
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
            label: 'ສົ່ງສັນຍານສຸກເສີນ',
            child: GestureDetector(
              onTap: widget.onTap,
              // The pulse scales to at most 1.5× (see `scale` below), so 1.5 is
              // exactly the space it needs. Reserving 1.8× held open ~54px that
              // nothing ever painted into, which on a 720px-tall screen was
              // enough to squeeze the dashboard below into a clipped sliver.
              child: SizedBox(
                width: buttonSize * 1.5,
                height: buttonSize * 1.5,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Pulse ring. Suppressed entirely under reduced motion.
                    if (!_reduceMotion)
                      AnimatedBuilder(
                        animation: _controller,
                        builder: (context, child) {
                          final scale = 1.0 + (_controller.value * 0.5);
                          final opacity = 0.35 * (1.0 - _controller.value);

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

                    // The button itself stays a circle: a round, thumb-sized
                    // target is an affordance — it reads as a panic button.
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
            'ກົດເພື່ອສົ່ງສັນຍານສຸກເສີນ',
            style: context.text.bodyMedium,
          ),
        ],
      ),
    );
  }
}
