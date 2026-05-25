// استيراد Firebase
import { getFirestore, collection, query, onSnapshot, doc, updateDoc, addDoc, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// تهيئة Firestore
const db = window.db;
const auth = window.auth;
const COLLECTION_NAME = "reports";

// متغيرات عامة
let allUsers = [];
let selectedUserId = null;
let currentMessages = [];
let messageListener = null;
let currentTheme = 'light';

// عناصر DOM للتسجيل الدخول
const loginContainer = document.getElementById('loginContainer');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

// عناصر DOM الجديدة (مطابقة للتصميم الجديد)
const conversationsList = document.getElementById('conversationsList');
const messagesList = document.getElementById('messagesList');
const messagesContainer = document.getElementById('messagesContainer');
const emptyState = document.getElementById('emptyState');
const replyArea = document.getElementById('replyArea');
const chatHeader = document.getElementById('chatHeader');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const searchInput = document.getElementById('searchInput');
const usersCountSpan = document.getElementById('usersCount');
const totalTicketsSpan = document.getElementById('totalTickets');
const messagesEnd = document.getElementById('messagesEnd');
const showInfoBtn = document.getElementById('showInfoBtn');
const infoPanel = document.getElementById('infoPanel');
const closeInfoBtn = document.getElementById('closeInfoBtn');
const infoContent = document.getElementById('infoContent');
const logoutBtn = document.getElementById('logoutBtn');
const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
const toggleReplyBtn = document.getElementById('toggleReplyBtn');
const toggleStatusBtn = document.getElementById('toggleStatusBtn');
const statusDropdown = document.getElementById('statusDropdown');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const collapseBtn = document.getElementById('collapseSidebar');
const conversationsCountSpan = document.getElementById('conversationsCount');

// عناصر الـ Modal المخصصة لتعديل الرسالة
let editingMessageId = null;
const editModal = document.getElementById('editModal');
const editMessageTextarea = document.getElementById('editMessageTextarea');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');

// ========== دوال تسجيل الدخول ==========
function checkAuthState() {
    window.onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('✅ مسجل دخول:', user.email);
            loginContainer.style.display = 'none';
            appContainer.style.display = 'flex';
            init();
        } else {
            console.log('❌ لم يقم بتسجيل الدخول');
            loginContainer.style.display = 'flex';
            appContainer.style.display = 'none';
            resetLoginForm();
            
            // Reset mobile top bar and close drawer on logout
            const mobileTopBar = document.getElementById('mobileTopBar');
            if (mobileTopBar) mobileTopBar.style.display = '';
            closeMobileSidebar();
        }
    });
}

async function handleLogin(email, password) {
    loginBtn.disabled = true;
    loginError.style.display = 'none';
    
    try {
        await window.signInWithEmailAndPassword(auth, email, password);
        console.log('✅ تم تسجيل الدخول بنجاح');
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        
        let errorMessage = 'خطأ في تسجيل الدخول';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'البريد الإلكتروني غير مسجل';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'كلمة المرور غير صحيحة';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'البريد الإلكتروني غير صحيح';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'الحساب معطل';
        }
        
        loginError.textContent = '❌ ' + errorMessage;
        loginError.style.display = 'block';
    }
    
    loginBtn.disabled = false;
}

async function handleLogout() {
    try {
        await window.signOut(auth);
        console.log('✅ تم تسجيل الخروج');
        showToast('تم تسجيل الخروج بنجاح');
    } catch (error) {
        console.error('❌ خطأ في تسجيل الخروج:', error);
        showToast('خطأ في تسجيل الخروج', true);
    }
}

function resetLoginForm() {
    emailInput.value = '';
    passwordInput.value = '';
    loginError.style.display = 'none';
    if (emailInput) emailInput.focus();
}

// ========== دوال مساعدة ==========
function updateStatusDropdownClass(val) {
    const status = (typeof val === 'string') ? val : (val ? val.value : '');
    
    // Update native select if it exists and differs
    if (statusDropdown && statusDropdown.value !== status) {
        statusDropdown.value = status;
    }
    
    // Update native select class
    if (statusDropdown) {
        statusDropdown.classList.remove('status-pending', 'status-inprogress', 'status-solved');
        if (status === 'Pending') {
            statusDropdown.classList.add('status-pending');
        } else if (status === 'In Progress') {
            statusDropdown.classList.add('status-inprogress');
        } else if (status === 'Solved') {
            statusDropdown.classList.add('status-solved');
        }
    }
    
    // Update Custom Dropdown Trigger UI
    const trigger = document.getElementById('statusDropdownTrigger');
    if (trigger) {
        trigger.classList.remove('status-pending', 'status-inprogress', 'status-solved');
        const triggerText = trigger.querySelector('.trigger-text');
        
        if (status === 'Pending') {
            trigger.classList.add('status-pending');
            if (triggerText) triggerText.innerHTML = '⏳ قيد الانتظار';
        } else if (status === 'In Progress') {
            trigger.classList.add('status-inprogress');
            if (triggerText) triggerText.innerHTML = '🔄 قيد المعالجة';
        } else if (status === 'Solved') {
            trigger.classList.add('status-solved');
            if (triggerText) triggerText.innerHTML = '✅ تم الحل';
        }
    }
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.style.background = isError ? '#ef4444' : '#10b981';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) {
        return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) {
        return date.toLocaleDateString('ar-SA', { weekday: 'short' });
    } else {
        return date.toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit' });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== دوال الوضع المظلم ==========
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    currentTheme = theme;
    if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (themeToggleBtn) {
            const lightIcon = themeToggleBtn.querySelector('.theme-icon-light');
            const darkIcon = themeToggleBtn.querySelector('.theme-icon-dark');
            if (lightIcon) lightIcon.style.display = 'none';
            if (darkIcon) darkIcon.style.display = 'block';
        }
    } else {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        if (themeToggleBtn) {
            const lightIcon = themeToggleBtn.querySelector('.theme-icon-light');
            const darkIcon = themeToggleBtn.querySelector('.theme-icon-dark');
            if (lightIcon) lightIcon.style.display = 'block';
            if (darkIcon) darkIcon.style.display = 'none';
        }
    }
}

function toggleTheme() {
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
}

// ========== دوال المستخدمين والمحادثات ==========
function loadUsers() {
    const q = query(collection(db, COLLECTION_NAME));
    
    onSnapshot(q, (snapshot) => {
        allUsers = [];
        console.log('📊 عدد التقارير:', snapshot.size);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const messages = data.messages || [];
            const lastMessage = messages[messages.length - 1];
            
            allUsers.push({
                id: doc.id,
                ...data,
                lastMessageText: lastMessage?.text || 'لا توجد رسائل',
                lastMessageTime: lastMessage?.timestamp || data.timestamp || 0,
                unreadCount: messages.filter(m => m.sender === 'user' && !m.read).length
            });
        });
        
        allUsers.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
        
        if (usersCountSpan) usersCountSpan.textContent = allUsers.length;
        if (totalTicketsSpan) totalTicketsSpan.textContent = allUsers.filter(u => u.status !== 'Solved').length;
        if (conversationsCountSpan) conversationsCountSpan.textContent = allUsers.length;
        
        renderUsersList();
        
        if (allUsers.length === 0) {
            console.warn('⚠️ لا توجد بيانات في قاعدة البيانات بعد!');
        }
    }, (error) => {
        console.error('❌ خطأ في تحميل البيانات:', error);
        showToast('❌ خطأ في تحميل البيانات: ' + error.message, true);
    });
}

function renderUsersList() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const filteredUsers = allUsers.filter(user => {
        const searchText = (user.userName || user.userEmail || user.userId || '').toLowerCase();
        return searchText.includes(searchTerm);
    });
    
    if (!conversationsList) return;
    
    if (filteredUsers.length === 0) {
        conversationsList.innerHTML = '<div class="loading-state"><p>لا يوجد مستخدمين</p></div>';
        return;
    }
    
    conversationsList.innerHTML = filteredUsers.map(user => {
        const displayName = user.userName || user.userEmail || user.userId || 'مستخدم مجهول';
        const isActive = selectedUserId === user.id;
        return `
            <div class="conversation-item-new ${isActive ? 'active' : ''}" data-user-id="${user.id}">
                <div class="conversation-avatar-new">
                    ${displayName.charAt(0).toUpperCase()}
                    <span class="avatar-status-dot ${user.userInChat || user.inChat ? 'in-chat' : (user.userOnline || user.online || user.active || user.isOnline ? 'active-app' : 'offline')}"></span>
                </div>
                <div class="conversation-content-new">
                    <div class="conversation-name-new">${escapeHtml(displayName)}</div>
                    <div class="conversation-preview-new">${escapeHtml(user.lastMessageText.substring(0, 40))}</div>
                </div>
                <div class="conversation-meta-new">
                    <div class="conversation-time-new">${formatTime(user.lastMessageTime)}</div>
                    ${user.unreadCount > 0 ? `<div class="unread-dot"></div>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.conversation-item-new').forEach(item => {
        item.addEventListener('click', () => {
            const userId = item.dataset.userId;
            selectUser(userId);
        });
    });
}

function openMobileSidebar() {
    const sidebar = document.querySelector('.sidebar-new');
    if (sidebar) sidebar.classList.add('open');
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.style.display = 'block';
}

function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar-new');
    if (sidebar) sidebar.classList.remove('open');
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.style.display = 'none';
}

function updateUserPresenceUI(user) {
    if (!user) return;
    
    const userStatusDot = document.getElementById('userStatusDot');
    const userStatusElem = document.getElementById('userStatus');
    
    if (userStatusDot && userStatusElem) {
        userStatusDot.className = 'status-dot';
        
        const isUserInChat = user.userInChat || user.inChat || user.user_in_chat || user.in_chat;
        const isUserOnline = user.userOnline || user.online || user.active || user.isOnline || user.user_online || user.is_online || user.isActive;
        
        if (isUserInChat) {
            userStatusDot.classList.add('in-chat');
            userStatusElem.textContent = 'متصل الآن في المحادثة';
            userStatusElem.style.color = 'var(--success)';
        } else if (isUserOnline) {
            userStatusDot.classList.add('active-app');
            userStatusElem.textContent = 'نشط في التطبيق';
            userStatusElem.style.color = 'var(--info)';
        } else {
            userStatusDot.classList.add('offline');
            userStatusElem.textContent = 'غير متصل';
            userStatusElem.style.color = 'var(--gray-500)';
        }
    }
}

async function selectUser(userId) {
    cancelEditMode();
    closeMobileSidebar();
    
    // Hide mobileTopBar when in chat on mobile
    const mobileTopBar = document.getElementById('mobileTopBar');
    if (mobileTopBar) mobileTopBar.style.display = 'none';
    
    selectedUserId = userId;
    const user = allUsers.find(u => u.id === userId);
    
    if (!user) return;
    
    console.log("🔍 فتح البلاغ - بيانات المستند كاملة من Firestore:", user);
    
    renderUsersList();
    
    const displayName = user.userName || user.userEmail || user.userId || 'مستخدم مجهول';
    const userNameElem = document.getElementById('userName');
    const userAvatarElem = document.getElementById('userAvatar');
    
    if (userNameElem) userNameElem.textContent = displayName;
    if (userAvatarElem) userAvatarElem.innerHTML = `<span>${displayName.charAt(0).toUpperCase()}</span>`;
    
    updateUserPresenceUI(user);
    
    if (chatHeader) chatHeader.style.display = 'flex';
    if (replyArea) replyArea.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    
    const messages = user.messages || [];
    currentMessages = messages;
    renderMessages(messages);
    
    updateUserReplyButtonUI(user);
    
    const status = user.status || 'Pending';
    if (statusDropdown) {
        statusDropdown.value = status;
        updateStatusDropdownClass(status);
    }
    
    const unreadMessages = messages.filter(m => m.sender === 'user' && !m.read);
    if (unreadMessages.length > 0) {
        await markMessagesAsRead(userId, messages);
    }
}

async function markMessagesAsRead(userId, messages) {
    const updatedMessages = messages.map(msg => 
        msg.sender === 'user' && !msg.read ? { ...msg, read: true } : msg
    );
    
    try {
        const userRef = doc(db, COLLECTION_NAME, userId);
        await updateDoc(userRef, { messages: updatedMessages });
        
        const userIndex = allUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            allUsers[userIndex].messages = updatedMessages;
            allUsers[userIndex].unreadCount = 0;
            renderUsersList();
        }
    } catch (error) {
        console.error('خطأ في تعليم الرسائل كمقروءة:', error);
    }
}

function renderMessages(messages) {
    if (!messagesList) return;
    
    let messagesHtml = '';
    const user = allUsers.find(u => u.id === selectedUserId);
    
    // 1. Render the ticket details block first (if user exists)
    if (user) {
        // Find the problem description from any common fields
        const problemDescription = user.message || user.text || user.description || user.desc || user.problem || user.issue || user.report || user.reportText || user.report_text || user.problemDescription || user.problem_description || user.msg || '';
        
        const firstUserMsg = (messages || []).find(m => m.sender === 'user');
        const firstUserMsgText = firstUserMsg ? firstUserMsg.text : '';
        const hasDiffFirstMsg = firstUserMsgText && firstUserMsgText.trim() !== problemDescription.trim();

        messagesHtml += `
            <div class="problem-details-new">
                <div class="details-title-new">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="white" stroke-width="1.5"/>
                        <path d="M10 14V10M10 6H10.01" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    تفاصيل التذكرة والمشكلة
                </div>
                <div class="details-grid-new">
                    ${user.userName ? `<div class="detail-item-new"><span class="detail-label-new">اسم المستخدم</span><span class="detail-value-new">${escapeHtml(user.userName)}</span></div>` : ''}
                    ${user.userEmail ? `<div class="detail-item-new"><span class="detail-label-new">البريد الإلكتروني</span><span class="detail-value-new">${escapeHtml(user.userEmail)}</span></div>` : ''}
                    ${user.userId ? `<div class="detail-item-new"><span class="detail-label-new">معرف المستخدم</span><span class="detail-value-new">${escapeHtml(user.userId)}</span></div>` : ''}
                    ${user.reportId ? `<div class="detail-item-new"><span class="detail-label-new">رقم التقرير</span><span class="detail-value-new">${escapeHtml(user.reportId)}</span></div>` : ''}
                    ${user.device ? `<div class="detail-item-new"><span class="detail-label-new">الجهاز</span><span class="detail-value-new">${escapeHtml(user.device)}</span></div>` : ''}
                    ${user.page ? `<div class="detail-item-new"><span class="detail-label-new">الصفحة</span><span class="detail-value-new">${escapeHtml(user.page)}</span></div>` : ''}
                    ${user.part ? `<div class="detail-item-new"><span class="detail-label-new">القسم</span><span class="detail-value-new">${escapeHtml(user.part)}</span></div>` : ''}
                    ${user.appVersion ? `<div class="detail-item-new"><span class="detail-label-new">إصدار التطبيق</span><span class="detail-value-new">${escapeHtml(user.appVersion)}</span></div>` : ''}
                    ${user.status ? `<div class="detail-item-new"><span class="detail-label-new">الحالة</span><span class="detail-value-new">${escapeHtml(user.status)}</span></div>` : ''}
                    ${user.timestamp ? `<div class="detail-item-new"><span class="detail-label-new">تاريخ التقرير</span><span class="detail-value-new">${new Date(user.timestamp).toLocaleString('ar-SA')}</span></div>` : ''}
                </div>
                ${problemDescription ? `<div class="problem-message-new"><strong>📝 وصف المشكلة:</strong><br>${escapeHtml(problemDescription)}</div>` : ''}
                ${hasDiffFirstMsg ? `<div class="problem-message-new" style="background: rgba(255, 255, 255, 0.18); border-right: 3px solid #fff;"><strong>💬 رسالة المستخدم:</strong><br>${escapeHtml(firstUserMsgText)}</div>` : ''}
            </div>
        `;
    }
    
    // 2. Render messages list or empty state placeholder
    if (!messages || messages.length === 0) {
        messagesHtml += '<div class="empty-state-new" style="padding: 40px; text-align: center;">📭 لا توجد رسائل بعد</div>';
    } else {
        messagesHtml += messages.map((msg, index) => `
            <div class="message-new ${msg.sender}" data-msg-id="${index}">
                <div class="message-bubble-new">
                    <div class="message-text-new">${escapeHtml(msg.text || '')}</div>
                    <div class="message-meta-new">
                        <span>${formatTime(msg.timestamp)}</span>
                        ${msg.sender === 'admin' ? '<span>✓✓</span>' : ''}
                    </div>
                    ${msg.sender === 'admin' ? `
                        <div class="message-actions-new">
                            <button class="msg-btn-new edit-btn" data-msg-id="${index}" title="تعديل">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 20h9"></path>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                </svg>
                            </button>
                            <button class="msg-btn-new delete-btn" data-msg-id="${index}" title="حذف">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    
    messagesList.innerHTML = messagesHtml;
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const msgId = parseInt(btn.dataset.msgId);
            editMessage(msgId);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const msgId = parseInt(btn.dataset.msgId);
            deleteMessage(msgId);
        });
    });
    
    setTimeout(() => {
        if (messagesEnd) messagesEnd.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function editMessage(msgId) {
    if (!selectedUserId || !currentMessages[msgId]) return;
    
    editingMessageId = msgId;
    const message = currentMessages[msgId];
    
    if (messageInput) {
        messageInput.value = message.text || '';
        messageInput.focus();
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
        
        if (sendBtn) {
            sendBtn.disabled = false;
            const sendBtnSpan = sendBtn.querySelector('span');
            if (sendBtnSpan) sendBtnSpan.textContent = 'حفظ التعديل';
        }
    }
    
    const editModeIndicator = document.getElementById('editModeIndicator');
    if (editModeIndicator) {
        editModeIndicator.style.display = 'flex';
    }
}

function cancelEditMode() {
    editingMessageId = null;
    if (messageInput) {
        messageInput.value = '';
        messageInput.style.height = 'auto';
        if (sendBtn) {
            sendBtn.disabled = true;
            const sendBtnSpan = sendBtn.querySelector('span');
            if (sendBtnSpan) sendBtnSpan.textContent = 'إرسال';
        }
    }
    const editModeIndicator = document.getElementById('editModeIndicator');
    if (editModeIndicator) {
        editModeIndicator.style.display = 'none';
    }
}

function closeEditModal() {
    cancelEditMode();
}

async function saveMessageEdit() {
    if (editingMessageId === null || !selectedUserId) return;
    
    const newText = messageInput ? messageInput.value.trim() : '';
    if (newText) {
        currentMessages[editingMessageId].text = newText;
        currentMessages[editingMessageId].edited = true;
        currentMessages[editingMessageId].editedAt = Date.now();
        await updateMessagesInFirebase();
    }
    cancelEditMode();
}

function deleteMessage(msgId) {
    if (!selectedUserId || !currentMessages[msgId]) return;
    
    if (confirm('هل أنت متأكد من حذف هذه الرسالة؟')) {
        currentMessages.splice(msgId, 1);
        updateMessagesInFirebase();
    }
}

async function updateMessagesInFirebase() {
    try {
        const userRef = doc(db, COLLECTION_NAME, selectedUserId);
        await updateDoc(userRef, { messages: currentMessages });
        
        renderMessages(currentMessages);
        
        const userIndex = allUsers.findIndex(u => u.id === selectedUserId);
        if (userIndex !== -1) {
            allUsers[userIndex].messages = currentMessages;
            const lastMessage = currentMessages[currentMessages.length - 1];
            allUsers[userIndex].lastMessageText = lastMessage?.text || 'لا توجد رسائل';
            allUsers[userIndex].lastMessageTime = lastMessage?.timestamp || 0;
            renderUsersList();
        }
        
        showToast('✅ تم تحديث الرسالة بنجاح');
    } catch (error) {
        console.error('خطأ في تحديث الرسالة:', error);
        showToast('❌ فشل تحديث الرسالة', true);
    }
}

async function sendReply() {
    const text = messageInput ? messageInput.value.trim() : '';
    if (!text || !selectedUserId) return;
    
    const user = allUsers.find(u => u.id === selectedUserId);
    if (!user) return;
    
    const newMessage = {
        sender: 'admin',
        text: text,
        timestamp: Date.now(),
        read: true
    };
    
    const updatedMessages = [...(user.messages || []), newMessage];
    
    try {
        const userRef = doc(db, COLLECTION_NAME, selectedUserId);
        await updateDoc(userRef, { messages: updatedMessages });
        
        currentMessages = updatedMessages;
        renderMessages(updatedMessages);
        if (messageInput) messageInput.value = '';
        if (sendBtn) sendBtn.disabled = true;
        
        const userIndex = allUsers.findIndex(u => u.id === selectedUserId);
        if (userIndex !== -1) {
            allUsers[userIndex].messages = updatedMessages;
            allUsers[userIndex].lastMessageText = text;
            allUsers[userIndex].lastMessageTime = Date.now();
            renderUsersList();
        }
        
        showToast('✅ تم إرسال الرد بنجاح');
        await sendTelegramReply(user, text);
        
    } catch (error) {
        console.error('فشل الإرسال:', error);
        showToast('❌ فشل إرسال الرد', true);
    }
}

async function sendTelegramReply(user, message) {
    const BOT_TOKEN = '8874415978:AAFFA9AkQrEZczUXYvarf4L9c-MbYNEwA1s';
    const chatId = user.telegramChatId;
    
    if (!chatId || !BOT_TOKEN || BOT_TOKEN === '8874415978:AAFFA9AkQrEZczUXYvarf4L9c-MbYNEwA1s') {
        console.log('تيليجرام: لم يتم تكوين البوت بعد');
        return;
    }
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `📩 *رد من الدعم الفني*\n\n${message}\n\n🆔 معرف التذكرة: ${user.reportId || 'غير محدد'}`,
                parse_mode: 'Markdown'
            })
        });
        
        if (response.ok) {
            console.log('تم إرسال الرد إلى تيليجرام');
        }
    } catch (error) {
        console.error('خطأ في إرسال تيليجرام:', error);
    }
}

async function toggleUserReply() {
    if (!selectedUserId) return;
    
    const user = allUsers.find(u => u.id === selectedUserId);
    if (!user) return;
    
    user.canUserReply = user.canUserReply === undefined ? true : !user.canUserReply;
    
    try {
        const userRef = doc(db, COLLECTION_NAME, selectedUserId);
        await updateDoc(userRef, { canUserReply: user.canUserReply });
        
        updateUserReplyButtonUI(user);
        
        const statusText = user.canUserReply 
            ? '🔓 تم فتح المحادثة للرد' 
            : '🔒 تم قفل المحادثة ومنع الرد';
        showToast(statusText);
    } catch (error) {
        console.error('خطأ في تحديث حالة الرد:', error);
        showToast('❌ فشل تحديث الحالة', true);
        user.canUserReply = user.canUserReply === undefined ? false : !user.canUserReply;
    }
}

function updateUserReplyButtonUI(user) {
    if (!toggleReplyBtn) return;
    
    const isReplyEnabled = user.canUserReply === undefined ? true : user.canUserReply;
    
    if (isReplyEnabled) {
        toggleReplyBtn.classList.add('enabled');
        toggleReplyBtn.title = 'المحادثة مفتوحة (الرد متاح)';
        toggleReplyBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
            </svg>
        `;
    } else {
        toggleReplyBtn.classList.remove('enabled');
        toggleReplyBtn.title = 'المحادثة مغلقة (الرد معطل)';
        toggleReplyBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
        `;
    }
}

async function updateReportStatus() {
    if (!selectedUserId) return;
    
    const user = allUsers.find(u => u.id === selectedUserId);
    if (!user || !statusDropdown) return;
    
    const newStatus = statusDropdown.value;
    
    try {
        const userRef = doc(db, COLLECTION_NAME, selectedUserId);
        await updateDoc(userRef, { status: newStatus });
        
        user.status = newStatus;
        
        const statusMessages = {
            'Pending': '⏳ قيد الانتظار',
            'In Progress': '⚙️ قيد المعالجة',
            'Solved': '✅ تم الحل'
        };
        
        showToast(statusMessages[newStatus] || 'تم تحديث الحالة');
    } catch (error) {
        console.error('خطأ في تحديث حالة البلاغ:', error);
        showToast('❌ فشل تحديث الحالة', true);
        if (user.status && statusDropdown) {
            statusDropdown.value = user.status;
            updateStatusDropdownClass(user.status);
        }
    }
}

function showUserInfo() {
    const user = allUsers.find(u => u.id === selectedUserId);
    if (!user || !infoContent) return;
    
    const infoRows = [
        { label: 'اسم المستخدم', value: user.userName },
        { label: 'البريد الإلكتروني', value: user.userEmail },
        { label: 'معرف المستخدم', value: user.userId },
        { label: 'رقم التقرير', value: user.reportId },
        { label: 'الحالة', value: user.status },
        { label: 'الجهاز', value: user.device },
        { label: 'الصفحة', value: user.page },
        { label: 'القسم', value: user.part },
        { label: 'إصدار التطبيق', value: user.appVersion },
        { label: 'تاريخ التقرير', value: user.timestamp ? new Date(user.timestamp).toLocaleString('ar-SA') : '' }
    ];
    
    let html = infoRows
        .filter(row => row.value)
        .map(row => `
            <div class="info-row-new">
                <div class="info-label-new">${row.label}</div>
                <div class="info-value-new">${escapeHtml(row.value)}</div>
            </div>
        `).join('');
    
    if (user.message) {
        html += `
            <div class="info-row-new" style="border-top: 1px solid var(--gray-200); margin-top: 12px; padding-top: 12px;">
                <div class="info-label-new">وصف المشكلة</div>
                <div class="info-value-new" style="white-space: pre-wrap;">${escapeHtml(user.message)}</div>
            </div>
        `;
    }
    
    infoContent.innerHTML = html;
    if (infoPanel) infoPanel.style.display = 'block';
}

function listenToUserUpdates() {
    const q = query(collection(db, COLLECTION_NAME));
    
    onSnapshot(q, (snapshot) => {
        if (selectedUserId) {
            const updatedUser = snapshot.docs.find(doc => doc.id === selectedUserId);
            if (updatedUser) {
                const data = updatedUser.data();
                const messages = data.messages || [];
                
                // Update presence UI in real-time
                const userObj = { id: updatedUser.id, ...data };
                updateUserPresenceUI(userObj);
                
                // Sync status dropdown if updated externally
                if (statusDropdown && userObj.status && statusDropdown.value !== userObj.status) {
                    statusDropdown.value = userObj.status;
                    updateStatusDropdownClass(userObj.status);
                }
                
                if (JSON.stringify(messages) !== JSON.stringify(currentMessages)) {
                    currentMessages = messages;
                    renderMessages(messages);
                    
                    const newUserMessages = messages.filter(m => m.sender === 'user' && !m.read);
                    if (newUserMessages.length > 0) {
                        markMessagesAsRead(selectedUserId, messages);
                    }
                }
            }
        }
        
        const updatedUsers = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const messages = data.messages || [];
            const lastMessage = messages[messages.length - 1];
            
            updatedUsers.push({
                id: doc.id,
                ...data,
                lastMessageText: lastMessage?.text || 'لا توجد رسائل',
                lastMessageTime: lastMessage?.timestamp || data.timestamp || 0,
                unreadCount: messages.filter(m => m.sender === 'user' && !m.read).length
            });
        });
        
        updatedUsers.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
        allUsers = updatedUsers;
        
        if (usersCountSpan) usersCountSpan.textContent = allUsers.length;
        if (totalTicketsSpan) totalTicketsSpan.textContent = allUsers.filter(u => u.status !== 'Solved').length;
        if (conversationsCountSpan) conversationsCountSpan.textContent = allUsers.length;
        
        renderUsersList();
    });
}

// ========== مستمعي الأحداث ==========
async function handleSendOrSave() {
    if (editingMessageId !== null) {
        await saveMessageEdit();
    } else {
        await sendReply();
    }
}

function initEventListeners() {
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            if (sendBtn) sendBtn.disabled = !messageInput.value.trim();
        });
        
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (sendBtn && !sendBtn.disabled) handleSendOrSave();
            }
        });
    }
    
    if (sendBtn) sendBtn.addEventListener('click', handleSendOrSave);
    if (showInfoBtn) showInfoBtn.addEventListener('click', showUserInfo);
    if (closeInfoBtn) closeInfoBtn.addEventListener('click', () => {
        if (infoPanel) infoPanel.style.display = 'none';
    });
    if (toggleReplyBtn) toggleReplyBtn.addEventListener('click', toggleUserReply);
    if (statusDropdown) {
        statusDropdown.addEventListener('change', () => {
            updateReportStatus();
            updateStatusDropdownClass(statusDropdown);
        });
    }
    
    const cancelEditModeBtn = document.getElementById('cancelEditModeBtn');
    if (cancelEditModeBtn) {
        cancelEditModeBtn.addEventListener('click', cancelEditMode);
    }

    // Mobile Sidebar Drawer Toggles
    const mobileMenuToggleBtn = document.getElementById('mobileMenuToggleBtn');
    if (mobileMenuToggleBtn) {
        mobileMenuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openMobileSidebar();
        });
    }

    const headerMenuToggleBtn = document.getElementById('headerMenuToggleBtn');
    if (headerMenuToggleBtn) {
        headerMenuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openMobileSidebar();
        });
    }

    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            closeMobileSidebar();
        });
    }

    // تهيئة القائمة المنسدلة المخصصة (Custom Dropdown)
    const dropdownContainer = document.getElementById('statusDropdownContainer');
    const dropdownTrigger = document.getElementById('statusDropdownTrigger');
    const dropdownMenu = document.getElementById('statusDropdownMenu');
    
    if (dropdownTrigger && dropdownContainer && dropdownMenu) {
        dropdownTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = dropdownContainer.classList.contains('open');
            if (isOpen) {
                dropdownContainer.classList.remove('open');
                dropdownMenu.style.display = 'none';
            } else {
                dropdownContainer.classList.add('open');
                dropdownMenu.style.display = 'block';
            }
        });
    }

    document.addEventListener('click', () => {
        if (dropdownContainer) {
            dropdownContainer.classList.remove('open');
        }
        if (dropdownMenu) {
            dropdownMenu.style.display = 'none';
        }
    });

    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = item.dataset.value;
            if (statusDropdown) {
                statusDropdown.value = value;
                statusDropdown.dispatchEvent(new Event('change'));
            }
            if (dropdownContainer) {
                dropdownContainer.classList.remove('open');
            }
            if (dropdownMenu) {
                dropdownMenu.style.display = 'none';
            }
        });
    });
    if (searchInput) searchInput.addEventListener('input', renderUsersList);
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar-new');
            if (sidebar) sidebar.classList.toggle('collapsed');
        });
    }
    
    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);
    if (saveEditBtn) saveEditBtn.addEventListener('click', saveMessageEdit);
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            
            if (!email || !password) {
                if (loginError) {
                    loginError.textContent = '❌ يرجى ملء جميع الحقول';
                    loginError.style.display = 'block';
                }
                return;
            }
            
            handleLogin(email, password);
        });
    }
    
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', handleLogout);
}

// ========== تشغيل التطبيق ==========
function init() {
    console.log('🚀 جاري بدء تطبيق لوحة الدعم...');
    console.log('📦 Collection Name:', COLLECTION_NAME);
    
    if (!db) {
        console.error('❌ خطأ: Firebase لم يتم تهيئته بشكل صحيح!');
        showToast('❌ خطأ في تهيئة Firebase!', true);
        return;
    }
    
    loadUsers();
    listenToUserUpdates();
    showToast('✨ تم تشغيل لوحة التحكم بنجاح');
}

function initApp() {
    initTheme();
    initEventListeners();
    checkAuthState();
}

// تشغيل عند تحميل الصفحة
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initApp);
} else {
    setTimeout(initApp, 100);
}