import { ChevronRight, Bell, Mail, Calendar, Info } from 'lucide-react';

export function SettingsPage() {
  const settingsSections = [
    {
      title: 'Data Sources',
      items: [
        { icon: Bell, label: 'Notifications', subtitle: 'System and app notifications', enabled: true },
        { icon: Mail, label: 'Email', subtitle: 'Gmail integration', enabled: true },
      ],
    },
    {
      title: 'SMS Reminders',
      items: [
        { icon: Bell, label: 'Text Reminders', subtitle: 'SMS notifications', enabled: false },
      ],
    },
    {
      title: 'General',
      items: [
        { icon: Calendar, label: 'Calendar', subtitle: 'Sync with calendar', enabled: false },
        { icon: Info, label: 'About', subtitle: 'Version 1.0.0', enabled: null },
      ],
    },
  ];

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-800 mb-2">Settings</h1>
        <p className="text-gray-500">Manage your preferences</p>
      </div>

      {/* Settings sections */}
      <div className="space-y-6">
        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h2 className="text-gray-700 mb-3 px-2">{section.title}</h2>
            <div className="space-y-2">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <button
                    key={itemIndex}
                    className="w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-4 hover:shadow-md transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-3 rounded-xl">
                        <Icon size={20} className="text-purple-500" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-gray-800">{item.label}</h3>
                        <p className="text-gray-500 text-sm">{item.subtitle}</p>
                      </div>
                      {item.enabled !== null ? (
                        <div
                          className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center ${
                            item.enabled ? 'bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400' : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                              item.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </div>
                      ) : (
                        <ChevronRight size={20} className="text-gray-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
