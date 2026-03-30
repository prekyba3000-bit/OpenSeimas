import React from 'react';
import { ActivityItem } from './ActivityItem';
import { Vote, Users, FileText, TrendingUp, AlertCircle } from 'lucide-react';

interface Activity {
  icon: any;
  title: string;
  description: string;
  time: string;
  iconColor?: string;
}

interface ActivityFeedProps {
  activities?: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const defaultActivities: Activity[] = [
    {
      icon: Vote,
      title: 'New Vote Recorded',
      description: 'Budget Amendment 2026-A passed with 84 votes',
      time: '2m ago',
      iconColor: 'text-blue-400',
    },
    {
      icon: Users,
      title: 'MP Analysis Updated',
      description: 'Andrius Kubilius voting patterns recalculated',
      time: '15m ago',
      iconColor: 'text-green-400',
    },
    {
      icon: FileText,
      title: 'Bill Proposed',
      description: 'Healthcare Reform Bill submitted for review',
      time: '1h ago',
      iconColor: 'text-purple-400',
    },
    {
      icon: TrendingUp,
      title: 'Alignment Score Changed',
      description: 'LSDP and Tėvynės sąjunga alignment increased to 67%',
      time: '2h ago',
      iconColor: 'text-amber-400',
    },
    {
      icon: AlertCircle,
      title: 'System Alert',
      description: 'Database backup completed successfully',
      time: '3h ago',
      iconColor: 'text-gray-400',
    },
  ];

  const displayActivities = activities || defaultActivities;

  return (
    <div className="flex flex-col gap-4 p-6 rounded-xl bg-gray-800/30 backdrop-blur-xl border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Activity Feed</h3>
        <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
          View All
        </button>
      </div>

      {/* Activity Items */}
      <div className="space-y-2">
        {displayActivities.map((activity, index) => (
          <ActivityItem
            key={index}
            icon={activity.icon}
            title={activity.title}
            description={activity.description}
            time={activity.time}
            iconColor={activity.iconColor}
          />
        ))}
      </div>
    </div>
  );
}
