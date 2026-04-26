/**
 * 浮动客服入口（Floating Action Button）
 *
 * 设计目标：在不改动现有页面布局/Tab 结构的前提下提供"全局可达的客服入口"。
 *
 * 显示规则：
 * - 仅在主功能 Tab（SIM_CARD / ESIM / INBOX / PROFILE）展示
 * - 进入聊天页（DIALER）后由父组件控制隐藏，避免遮挡
 * - 携带未读小红点（来自 useUnreadChat），与会话内 mark-read 同步
 *
 * 视觉：56×56 圆形 + 与底部 Tab 同色橙渐变，positioned absolute
 * 在父容器内（手机框）右下角，不影响其它内容。
 */

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useUnreadChat } from '../hooks/useUnreadChat';

interface SupportFabProps {
  /** 仅在 visible=true 时挂载 / 计数 */
  visible: boolean;
  onClick: () => void;
}

const SupportFab: React.FC<SupportFabProps> = ({ visible, onClick }) => {
  const { unread } = useUnreadChat(visible);
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="open support chat"
      style={{
        position: 'absolute',
        right: 16,
        bottom: 92,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #FF6600, #FF8533)',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 8px 24px -4px rgba(255,102,0,0.45), 0 2px 6px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        WebkitTapHighlightColor: 'transparent',
      }}
      className="active:scale-95 transition-transform"
    >
      <MessageCircle size={26} color="#fff" strokeWidth={2.2} />
      {unread > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 18,
            height: 18,
            borderRadius: 10,
            backgroundColor: '#EF4444',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid white',
          }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
};

export default SupportFab;
