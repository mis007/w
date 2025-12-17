
import React from 'react';
import { AgentState, ServiceMode } from '../types';

interface AgentAvatarProps {
  state: AgentState;
  volume: number; // 0 to 1
  mode?: ServiceMode;
}

const AgentAvatar: React.FC<AgentAvatarProps> = ({ state, volume, mode = ServiceMode.GLOBAL }) => {
  const scale = 1 + (state === AgentState.SPEAKING ? Math.min(volume * 2, 0.2) : 0);
  const avatarUrl = "https://p3-flow-imagex-sign.byteimg.com/tos-cn-i-a9rns2rl98/fc199582e9de4dc0aa8504d355f9d556.png~tplv-a9rns2rl98-image.png?rcl=2025121504085354595C474DC6E532537C&rk3s=8e244e95&rrcfp=dafada99&x-expires=2081966933&x-signature=mxa8QnR473vsYNvqMJp61%2B5CG2M%3D"; 

  // Dynamic Colors based on Mode
  const ringColor = mode === ServiceMode.CN 
    ? (state === AgentState.LISTENING ? 'border-red-400' : state === AgentState.THINKING ? 'border-yellow-500' : 'border-red-200')
    : (state === AgentState.LISTENING ? 'border-blue-400' : state === AgentState.THINKING ? 'border-yellow-400' : 'border-pink-200');

  const badgeIcon = mode === ServiceMode.CN ? '🇨🇳' : '👩‍🌾';
  const tagColor = mode === ServiceMode.CN ? 'text-red-600' : 'text-rose-500';

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      
      {/* Heartbeat Effect */}
      <div className="absolute top-0 right-6 z-40 animate-bounce-slow">
        <div className={`bg-white p-1.5 rounded-full shadow-md border ${mode === ServiceMode.CN ? 'border-red-100' : 'border-rose-100'} flex items-center justify-center`}>
            <i className={`fas fa-heart text-sm animate-pulse ${mode === ServiceMode.CN ? 'text-red-500' : 'text-rose-500'}`}></i>
        </div>
      </div>

      {/* Main Avatar Container */}
      <div 
        className={`relative z-10 transition-transform duration-100 ease-out rounded-full border-[6px] border-white shadow-2xl overflow-hidden bg-white group ${state === AgentState.IDLE ? 'animate-tilt-slow' : ''}`}
        style={{ 
            width: '120px', 
            height: '120px', 
            transform: `scale(${scale})`,
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.15)'
        }}
      >
        <img src={avatarUrl} alt="Xiao Meng" className="w-full h-full object-cover transform translate-y-2" />
        
        {/* Blush Effect */}
        <div className="absolute top-[45%] left-[20%] w-4 h-2 bg-rose-300 rounded-full blur-md opacity-40 animate-pulse"></div>
        <div className="absolute top-[45%] right-[20%] w-4 h-2 bg-rose-300 rounded-full blur-md opacity-40 animate-pulse"></div>

        {/* Status Overlay Ring */}
        <div className={`absolute inset-0 border-4 rounded-full transition-colors duration-500 ${ringColor} ${state !== AgentState.IDLE ? 'animate-pulse' : ''}`}></div>
      </div>

      {/* Name Tag */}
      <div className={`absolute bottom-2 z-20 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg border transform translate-y-8 flex items-center gap-3 min-w-[140px] ${mode === ServiceMode.CN ? 'border-red-100' : 'border-rose-100'}`}>
        <div className="w-10 h-10 rounded-full bg-yellow-100 border-2 border-yellow-300 flex items-center justify-center shrink-0">
             <span className="text-xl">{badgeIcon}</span>
        </div>
        <div className="flex flex-col">
            <h2 className={`text-base font-black leading-tight ${tagColor}`}>村官小萌</h2>
            <span className="text-[10px] font-bold text-gray-400 leading-tight">
                {mode === ServiceMode.CN ? '东里专线服务中' : '东里村百事通'}
            </span>
        </div>
      </div>
      
      {/* State Bubble */}
      {state !== AgentState.IDLE && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 bg-white px-3 py-1.5 rounded-2xl shadow-lg animate-bounce z-30 border border-gray-100 whitespace-nowrap">
              <span className={`text-xs font-bold ${mode === ServiceMode.CN ? 'text-red-500' : 'text-blue-500'}`}>
                  {state === AgentState.LISTENING ? (mode === ServiceMode.CN ? '正在录音...' : '听着呢...') : '思考中...'}
              </span>
          </div>
      )}
      
      <style>{`
        @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        @keyframes tilt-slow {
             0%, 100% { transform: rotate(-2deg); }
             50% { transform: rotate(2deg); }
        }
        .animate-bounce-slow {
            animation: bounce-slow 2s infinite ease-in-out;
        }
        .animate-tilt-slow {
            animation: tilt-slow 3s infinite ease-in-out alternate;
        }
      `}</style>
    </div>
  );
};

export default AgentAvatar;
