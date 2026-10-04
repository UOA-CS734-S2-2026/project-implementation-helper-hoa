import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme_controller.dart';
import '../services/push_notification_service.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  bool _updatingPush = false;
  bool emailAlerts = true;
  bool biometricLogin = true;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textColor = colorScheme.onSurface;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 30),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  GestureDetector(
                    onTap: () => context.go('/'),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Theme.of(context).cardColor,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.arrow_back_ios_new_rounded,
                        color: Color(0xFF4E6CD6),
                        size: 18,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Settings',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: textColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),

              _settingsCard(
                title: 'Account',
                children: [
                  _listItem(
                    icon: Icons.person_outline_rounded,
                    title: 'Profile',
                    subtitle: 'Manage account details',
                    trailing: const Icon(Icons.chevron_right_rounded),
                  ),
                  _listItem(
                    icon: Icons.lock_outline_rounded,
                    title: 'Security',
                    subtitle: 'Password and login security',
                    trailing: const Icon(Icons.chevron_right_rounded),
                  ),
                ],
              ),

              const SizedBox(height: 18),

              _settingsCard(
                title: 'Preferences',
                children: [
                  ListenableBuilder(
                    listenable: PushNotificationService.instance,
                    builder: (context, _) {
                      final push = PushNotificationService.instance;
                      return SwitchListTile(
                        value: push.enabled,
                        onChanged: !push.supported || _updatingPush
                            ? null
                            : _setPushEnabled,
                        activeThumbColor: const Color(0xFF4E6CD6),
                        title: const Text('Push notifications'),
                        subtitle: Text(push.status),
                        contentPadding:
                            const EdgeInsets.symmetric(horizontal: 16),
                      );
                    },
                  ),
                  SwitchListTile(
                    value: emailAlerts,
                    onChanged: (value) => setState(() => emailAlerts = value),
                    activeThumbColor: const Color(0xFF4E6CD6),
                    title: const Text('Email alerts'),
                    subtitle: const Text('Summary reports and updates'),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                  ValueListenableBuilder<ThemeMode>(
                    valueListenable: ThemeController.mode,
                    builder: (context, mode, _) {
                      return Padding(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Theme',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: textColor,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Choose light, dark, or match device settings',
                              style: TextStyle(
                                fontSize: 12,
                                color: colorScheme.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: 12),
                            SegmentedButton<ThemeMode>(
                              segments: const [
                                ButtonSegment(
                                  value: ThemeMode.light,
                                  label: Text('Light'),
                                  icon: Icon(Icons.light_mode_outlined),
                                ),
                                ButtonSegment(
                                  value: ThemeMode.dark,
                                  label: Text('Dark'),
                                  icon: Icon(Icons.dark_mode_outlined),
                                ),
                                ButtonSegment(
                                  value: ThemeMode.system,
                                  label: Text('Device'),
                                  icon: Icon(Icons.settings_suggest_outlined),
                                ),
                              ],
                              selected: {mode},
                              onSelectionChanged: (selection) {
                                ThemeController.mode.value = selection.first;
                              },
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),

              const SizedBox(height: 18),

              _settingsCard(
                title: 'Security',
                children: [
                  SwitchListTile(
                    value: biometricLogin,
                    onChanged: (value) => setState(() => biometricLogin = value),
                    activeThumbColor: const Color(0xFF4E6CD6),
                    title: const Text('Biometric login'),
                    subtitle: const Text('Use Face ID / fingerprint'),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                ],
              ),

              const SizedBox(height: 18),

              _settingsCard(
                title: 'Support',
                children: [
                  _listItem(
                    icon: Icons.help_outline_rounded,
                    title: 'Help center',
                    subtitle: 'Find answers and tutorials',
                    trailing: const Icon(Icons.chevron_right_rounded),
                  ),
                  _listItem(
                    icon: Icons.info_outline_rounded,
                    title: 'About',
                    subtitle: 'App version and legal info',
                    trailing: const Icon(Icons.chevron_right_rounded),
                  ),
                ],
              ),

              const SizedBox(height: 22),

              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).cardColor,
                    foregroundColor: textColor,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    'Log out',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _setPushEnabled(bool enabled) async {
    setState(() => _updatingPush = true);
    try {
      await PushNotificationService.instance.setEnabled(enabled);
    } on Exception catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } on StateError catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _updatingPush = false);
    }
  }

  Widget _settingsCard({
    required String title,
    required List<Widget> children,
  }) {
    return Builder(
      builder: (context) {
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.only(top: 8, bottom: 6),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
              ...children,
            ],
          ),
        );
      },
    );
  }

  Widget _listItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required Widget trailing,
  }) {
    return Builder(
      builder: (context) {
        return ListTile(
          leading: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFF4E6CD6).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: const Color(0xFF4E6CD6), size: 20),
          ),
          title: Text(
            title,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          subtitle: Text(
            subtitle,
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          trailing: trailing,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
        );
      },
    );
  }
}