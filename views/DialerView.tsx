import React, { useState, useEffect } from 'react';
import { Phone, Delete, UserPlus, Mic, Volume2, Video, Grid3x3, PhoneOff, ChevronLeft, Star, Hash } from 'lucide-react';

interface DialerViewProps {
  onBack: () => void;
}

const DialerView: React.FC<DialerViewProps> = ({ onBack }) => {
  const [number, setNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isCalling) {
        interval = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    } else {
        setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isCalling]);

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const handlePress = (val: string) => {
    if (number.length < 15) setNumber(prev => prev + val);
  };

  const handleDelete = () => {
    setNumber(prev => prev.slice(0, -1));
  };

  // iOS-style Keypad Button
  const KeypadButton = ({ main, sub, onClick }: { main: React.ReactNode, sub?: string, onClick?: () => void }) => (
    <button 
      onClick={onClick || (() => handlePress(main as string))}
      className="w-[78px] h-[78px] rounded-full bg-[#E5E5EA] active:bg-[#D1D1D6] transition-colors flex flex-col items-center justify-center mx-auto select-none touch-manipulation group"
    >
        <span className="text-[32px] font-normal text-slate-900 leading-none mb-0.5 group-active:scale-95 transition-transform">{main}</span>
        {sub && <span className="text-[10px] font-bold text-slate-900/40 tracking-[2px] uppercase group-active:scale-95 transition-transform">{sub}</span>}
    </button>
  );

  // --- CALLING SCREEN (Dark Glass Mode) ---
  if (isCalling) {
      return (
          <div className="absolute inset-0 z-[60] bg-slate-900/95 backdrop-blur-3xl flex flex-col items-center pt-20 pb-12 animate-in fade-in zoom-in duration-300">
             {/* Dynamic Background Gradient */}
             <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-gradient-to-b from-[#2c3e50] to-transparent opacity-40 rounded-full blur-3xl pointer-events-none"></div>

             <div className="flex flex-col items-center relative z-10 flex-1 justify-start pt-10">
                 <div className="w-32 h-32 bg-slate-700/50 backdrop-blur-md rounded-full flex items-center justify-center text-4xl text-white font-medium mb-6 shadow-2xl ring-1 ring-white/10">
                     {number.slice(0, 1) || 'U'}
                 </div>
                 <h2 className="text-white text-3xl font-medium mb-3 tracking-tight">{number || 'Unknown'}</h2>
                 <p className="text-white/60 text-base font-medium">
                     {callDuration > 2 ? formatTime(callDuration) : 'Calling...'}
                 </p>
             </div>

             {/* In-Call Controls */}
             <div className="w-full px-8 relative z-10">
                 <div className="grid grid-cols-3 gap-y-8 gap-x-6 mb-16">
                     <CallControl icon={Mic} label="mute" />
                     <CallControl icon={Grid3x3} label="keypad" />
                     <CallControl icon={Volume2} label="audio" active />
                     <CallControl icon={UserPlus} label="add call" />
                     <CallControl icon={Video} label="FaceTime" />
                     <CallControl icon={UserPlus} label="contacts" disabled />
                 </div>

                 <div className="flex justify-center pb-8">
                     <button 
                        onClick={() => setIsCalling(false)}
                        className="w-20 h-20 rounded-full bg-[#FF3B30] hover:bg-[#ff453a] shadow-lg shadow-red-900/20 active:scale-90 transition-all flex items-center justify-center text-white"
                     >
                         <PhoneOff size={36} fill="currentColor" />
                     </button>
                 </div>
             </div>
          </div>
      )
  }

  // --- DIALER SCREEN (Light Mode) ---
  return (
    <div className="h-full bg-white flex flex-col pt-safe pb-6 relative overflow-hidden">
       
       {/* Navigation Bar */}
       <div className="absolute top-0 left-0 right-0 h-14 z-20 flex items-end pb-2 px-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-1 text-brand-orange active:opacity-50 transition-opacity px-2 py-2 rounded-lg"
          >
            <ChevronLeft size={26} strokeWidth={2.5} />
            <span className="text-[17px] font-medium leading-none mb-0.5">Back</span>
          </button>
       </div>

       {/* Number Display Area */}
       <div className="flex-1 flex flex-col items-center justify-center max-h-[30%] px-8">
           <div className="text-[42px] font-medium text-slate-900 tracking-tight text-center leading-tight break-all min-h-[50px] transition-all">
               {number}
               {/* Flashing Cursor */}
               {number.length < 15 && <span className="w-[3px] h-[40px] bg-brand-orange inline-block align-middle ml-1 animate-pulse rounded-full"></span>}
           </div>
           
           {number.length > 0 ? (
               <button className="text-slate-400 text-[13px] font-medium mt-3 hover:text-brand-orange transition-colors active:opacity-50">
                   Add Number
               </button>
           ) : (
             <div className="h-[20px]"></div> // Spacer to prevent layout jump
           )}
       </div>

       {/* Keypad Area */}
       <div className="px-8 pb-4">
           <div className="grid grid-cols-3 gap-y-5 gap-x-6 mb-6 max-w-[320px] mx-auto">
               <KeypadButton main="1" sub=" " />
               <KeypadButton main="2" sub="ABC" />
               <KeypadButton main="3" sub="DEF" />
               <KeypadButton main="4" sub="GHI" />
               <KeypadButton main="5" sub="JKL" />
               <KeypadButton main="6" sub="MNO" />
               <KeypadButton main="7" sub="PQRS" />
               <KeypadButton main="8" sub="TUV" />
               <KeypadButton main="9" sub="WXYZ" />
               <KeypadButton main="*" onClick={() => handlePress('*')} />
               <KeypadButton main="0" sub="+" onClick={() => handlePress('0')} />
               <KeypadButton main="#" onClick={() => handlePress('#')} />
           </div>

           {/* Call Actions Row */}
           <div className="grid grid-cols-3 items-center max-w-[320px] mx-auto mt-4">
               {/* Empty Left Slot */}
               <div className="flex justify-center"></div>

               {/* Call Button (Center) */}
               <div className="flex justify-center">
                   <button 
                    onClick={() => setIsCalling(true)}
                    className="w-[78px] h-[78px] rounded-full bg-[#34C759] active:bg-[#32b350] shadow-md shadow-green-900/5 active:scale-95 transition-all flex items-center justify-center text-white"
                   >
                       <Phone size={36} fill="currentColor" />
                   </button>
               </div>

               {/* Delete Button (Right) */}
               <div className="flex justify-center">
                   {number.length > 0 && (
                       <button 
                        onClick={handleDelete} 
                        className="text-slate-300 w-[78px] h-[78px] flex items-center justify-center active:text-slate-500 transition-colors"
                       >
                           <Delete size={30} strokeWidth={2} />
                       </button>
                   )}
               </div>
           </div>
       </div>

    </div>
  );
};

// Helper Component for In-Call Buttons
const CallControl = ({ icon: Icon, label, active, disabled }: { icon: any, label: string, active?: boolean, disabled?: boolean }) => (
    <div className={`flex flex-col items-center gap-3 ${disabled ? 'opacity-30' : ''}`}>
        <button className={`w-[72px] h-[72px] rounded-full flex items-center justify-center text-white text-3xl transition-all ${active ? 'bg-white text-slate-900' : 'bg-white/10 backdrop-blur-md active:bg-white/20'}`}>
            <Icon size={32} strokeWidth={1.5} fill={active ? "currentColor" : "none"} />
        </button>
        <span className="text-white text-xs font-medium tracking-wide capitalize">{label}</span>
    </div>
);

export default DialerView;