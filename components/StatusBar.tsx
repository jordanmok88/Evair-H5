import React from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

const StatusBar: React.FC = () => {
  return (
    <div className="w-full h-12 flex justify-between items-center px-6 pt-2 select-none z-50 absolute top-0 text-slate-900">
        <span className="font-semibold text-sm tracking-wide">9:41</span>
        <div className="flex items-center gap-2">
            <Signal size={14} className="fill-current" />
            <Wifi size={16} />
            <Battery size={20} className="fill-current" />
        </div>
    </div>
  );
};

export default StatusBar;