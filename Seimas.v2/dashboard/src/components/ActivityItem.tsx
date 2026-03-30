import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ActivityItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  time: string;
  iconColor?: string;
}

export function ActivityItem({
  icon: Icon,
  title,
  description,
  time,
  iconColor = 'text-blue-400',
}: ActivityItemProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center ${iconColor} group-hover:bg-gray-700 transition-colors`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
        <p className="text-sm text-gray-400 truncate">{description}</p>
      </div>

      {/* Time */}
      <div className="flex-shrink-0 text-xs text-gray-500">
        {time}
      </div>
    </div>
  );
}
