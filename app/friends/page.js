/* app/profile/[username]/profile.module.css */
.page {
  min-height: 100vh;
  background: #080810;
  color: #f0f0f5;
  font-family: var(--font-outfit), sans-serif;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(108,99,255,0.2);
  border-top-color: #6c63ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.notFound {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
  color: rgba(240,240,245,0.4);
  font-size: 15px;
}

.main {
  display: flex;
  justify-content: center;
  padding: 4rem 1rem;
}

.card {
  background: #0f0f1a;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 3rem 2.5rem;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.avatarWrap {
  margin-bottom: 0.5rem;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(108,99,255,0.25);
}

.avatarFallback {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(108,99,255,0.15);
  border: 3px solid rgba(108,99,255,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 600;
  color: #6c63ff;
}

.username {
  font-size: 1.35rem;
  font-weight: 600;
  color: #f0f0f5;
}

.bio {
  font-size: 14px;
  color: rgba(240,240,245,0.5);
  line-height: 1.7;
  max-width: 300px;
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.addBtn {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  background: #6c63ff;
  border: none;
  padding: 0.65rem 1.25rem;
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.2s;
}

.addBtn:hover:not(:disabled) { opacity: 0.85; }

.pendingBtn {
  font-size: 14px;
  font-weight: 500;
  color: rgba(240,240,245,0.4);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 0.65rem 1.25rem;
  border-radius: 9px;
  cursor: not-allowed;
  font-family: inherit;
}

.acceptBtn {
  font-size: 14px;
  font-weight: 500;
  color: rgba(50,210,120,0.9);
  background: rgba(50,210,120,0.1);
  border: 1px solid rgba(50,210,120,0.25);
  padding: 0.65rem 1.25rem;
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s;
}

.acceptBtn:hover:not(:disabled) { background: rgba(50,210,120,0.18); }

.friendsBtn {
  font-size: 14px;
  font-weight: 500;
  color: rgba(50,210,120,0.85);
  background: rgba(50,210,120,0.08);
  border: 1px solid rgba(50,210,120,0.2);
  padding: 0.65rem 1.25rem;
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s, color 0.2s;
}

.friendsBtn:hover:not(:disabled) {
  background: rgba(255,80,80,0.08);
  color: rgba(255,100,100,0.8);
  border-color: rgba(255,80,80,0.2);
}

.msgBtn {
  font-size: 14px;
  font-weight: 500;
  color: rgba(240,240,245,0.7);
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 0.65rem 1.25rem;
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s, color 0.2s;
}

.msgBtn:hover {
  background: rgba(255,255,255,0.09);
  color: #f0f0f5;
}

.editBtn {
  font-size: 14px;
  font-weight: 500;
  color: rgba(240,240,245,0.6);
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 0.65rem 1.25rem;
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s;
}

.editBtn:hover { background: rgba(255,255,255,0.09); }