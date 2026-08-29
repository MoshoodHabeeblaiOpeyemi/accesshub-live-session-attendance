// 1. IMPORT FIREBASE TOOLS 🧰
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, onSnapshot, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. YOUR FIREBASE CONFIGURATION 🔗
const firebaseConfig = {
  apiKey: "AIzaSyCOxB2OXsTD5m4KCHbxFNhWIjn_3JiZZHU",
  authDomain: "attendance-82604.firebaseapp.com",
  projectId: "attendance-82604",
  storageBucket: "attendance-82604.firebasestorage.app",
  messagingSenderId: "684977293672",
  appId: "1:684977293672:web:8c57936adc38a48d032edd"
};

// 3. INITIALIZE FIREBASE & OFFLINE PERSISTENCE 🚀💾
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
const auth = getAuth(app);

// 4. GRAB UI ELEMENTS 🎯
const adminLoginSection = document.getElementById("adminLoginSection");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminDashboard = document.getElementById("adminDashboard");
const logoutBtn = document.getElementById("logoutBtn");

const authCardTitle = document.getElementById("authCardTitle");
const authSubtitle = document.getElementById("authSubtitle");
const nameFieldContainer = document.getElementById("nameFieldContainer");
const instructorNameInput = document.getElementById("instructorName");
const toggleText = document.getElementById("toggleText");
const authModeToggleBtn = document.getElementById("authModeToggleBtn");

const sessionTitleInput = document.getElementById("sessionTitle");
const sessionInputGroup = document.getElementById("sessionInputGroup");
const generateCodeBtn = document.getElementById("generateCodeBtn");
const activeSessionDiv = document.getElementById("activeSessionDiv");
const activeSessionTitleDisplay = document.getElementById("activeSessionTitleDisplay");
const liveCodeDisplay = document.getElementById("liveCode");
const closeSessionBtn = document.getElementById("closeSessionBtn");

const liveCount = document.getElementById("liveCount");
const adminAttendeeList = document.getElementById("adminAttendeeList");
const toastContainer = document.getElementById("toastContainer");

// Global states
let isSignUpMode = false;
let currentLiveCode = "";
let currentSessionTitle = "";
let currentSessionId = ""; 
let knownAttendees = new Set();

// ==========================================
// 🔄 TOGGLE BETWEEN LOGIN & SIGN UP MODES
// ==========================================
authModeToggleBtn.addEventListener("click", () => {
  isSignUpMode = !isSignUpMode;
  
  if (isSignUpMode) {
    authCardTitle.textContent = "Instructor Sign Up 🚀";
    authSubtitle.textContent = "Create an account to host your own live attendance sessions.";
    nameFieldContainer.style.display = "block";
    instructorNameInput.required = true;
    adminLoginBtn.textContent = "Create Account ✨";
    toggleText.textContent = "Already have an account?";
    authModeToggleBtn.textContent = "Log in";
  } else {
    authCardTitle.textContent = "Instructor Portal 🔐";
    authSubtitle.textContent = "Authenticate to access your command center.";
    nameFieldContainer.style.display = "none";
    instructorNameInput.required = false;
    adminLoginBtn.textContent = "Secure Login 🛡️";
    toggleText.textContent = "New instructor?";
    authModeToggleBtn.textContent = "Create an account";
  }
});

// ==========================================
// 🔐 AUTH GATE: LOGIN OR SIGN UP
// ==========================================
adminLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();
  const instructorName = instructorNameInput.value.trim();

  adminLoginBtn.textContent = isSignUpMode ? "Creating Account... ⏳" : "Authenticating... ⏳";
  adminLoginBtn.disabled = true;

  try {
    let userCredential;

    if (isSignUpMode) {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "instructors", userCredential.user.uid), {
        name: instructorName,
        email: email,
        createdAt: new Date().toISOString()
      });
    } else {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    }
    
    currentSessionId = userCredential.user.uid;

    // Success! Hide auth gate, reveal the command center 🎛️
    adminLoginSection.style.display = "none";
    adminDashboard.style.display = "block";
    logoutBtn.style.display = "inline-block";

    // 🔍 CHECK IF THIS INSTRUCTOR ALREADY HAS AN ACTIVE OPEN SESSION! 🏢
    await restoreExistingSession(currentSessionId);
    
  } catch (error) {
    console.error("Auth Failed:", error);
    alert("❌ Authentication Error: " + error.message);
    adminLoginBtn.textContent = isSignUpMode ? "Create Account ✨" : "Secure Login 🛡️";
    adminLoginBtn.disabled = false;
  }
});

// ==========================================
// 🔄 RESTORE SESSION IF ALREADY ACTIVE 🕵️‍♂️
// ==========================================
async function restoreExistingSession(instructorId) {
  try {
    const sessionDocRef = doc(db, "sessions", instructorId);
    const sessionSnap = await getDoc(sessionDocRef);

    if (sessionSnap.exists()) {
      const data = sessionSnap.data();
      
      // If the class is still open, restore it on the screen! ✨
      if (data.isOpen === true) {
        currentLiveCode = data.code;
        currentSessionTitle = data.sessionTitle || "Live Class";

        sessionInputGroup.style.display = "none";
        generateCodeBtn.style.display = "none";
        activeSessionDiv.style.display = "block";
        activeSessionTitleDisplay.textContent = `📚 ${currentSessionTitle}`;
        liveCodeDisplay.textContent = currentLiveCode;

        // Restart the live attendee listener
        startLiveListener();
      }
    }
  } catch (error) {
    console.error("Error restoring session:", error);
  }
}

// ==========================================
// 🚪 ADMIN LOGOUT LOGIC
// ==========================================
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    adminDashboard.style.display = "none";
    adminLoginSection.style.display = "block";
    logoutBtn.style.display = "none";
    adminLoginForm.reset();
    adminLoginBtn.textContent = "Secure Login 🛡️";
    adminLoginBtn.disabled = false;
    
    // Reset session states & UI controls
    currentSessionId = "";
    currentLiveCode = "";
    currentSessionTitle = "";
    knownAttendees.clear();
    sessionInputGroup.style.display = "block";
    generateCodeBtn.style.display = "block";
    generateCodeBtn.disabled = false;
    generateCodeBtn.textContent = "Open Class & Generate Code 🚀";
    activeSessionDiv.style.display = "none";
  } catch (error) {
    console.error("Logout error:", error);
    alert("⚠️ Error signing out.");
  }
});

// ==========================================
// 🚀 OPEN CLASS: GENERATE ISOLATED CODE & TITLE
// ==========================================
generateCodeBtn.addEventListener("click", async () => {
  const title = sessionTitleInput.value.trim();
  if (!title) {
    alert("❌ Please enter a class or session title first.");
    sessionTitleInput.focus();
    return;
  }

  currentSessionTitle = title;
  currentLiveCode = Math.floor(1000 + Math.random() * 9000).toString();
  
  generateCodeBtn.textContent = "Opening Class... ⏳";
  generateCodeBtn.disabled = true;

  try {
    await setDoc(doc(db, "sessions", currentSessionId), {
      code: currentLiveCode,
      sessionTitle: currentSessionTitle,
      instructorId: currentSessionId,
      isOpen: true,
      createdAt: new Date().toISOString()
    });

    sessionInputGroup.style.display = "none";
    generateCodeBtn.style.display = "none";
    activeSessionDiv.style.display = "block";
    activeSessionTitleDisplay.textContent = `📚 ${currentSessionTitle}`;
    liveCodeDisplay.textContent = currentLiveCode;

    startLiveListener();

  } catch (error) {
    console.error("Error creating session:", error);
    alert("⚠️ Could not open class. Check connection.");
    generateCodeBtn.textContent = "Open Class & Generate Code 🚀";
    generateCodeBtn.disabled = false;
  }
});

// ==========================================
// 👀 REAL-TIME LISTENER & TOAST LOGIC
// ==========================================
function startLiveListener() {
  const q = query(
    collection(db, "live_attendees"), 
    where("instructorId", "==", currentSessionId),
    where("sessionCode", "==", currentLiveCode)
  );
  
  onSnapshot(q, (snapshot) => {
    liveCount.textContent = snapshot.size;
    adminAttendeeList.innerHTML = "";
    
    if (snapshot.empty) {
      adminAttendeeList.innerHTML = '<p id="emptyState" style="text-align: center; color: var(--muted);">Waiting for students to join...</p>';
    }

    snapshot.forEach((docSnap) => {
      const student = docSnap.data();
      
      const li = document.createElement("li");
      li.innerHTML = `<span>${student.name}</span> <span style="color: var(--muted); font-size: 0.9em; font-weight: normal; margin-left: auto;">${student.email}</span>`;
      adminAttendeeList.appendChild(li);

      if (!knownAttendees.has(student.email)) {
        knownAttendees.add(student.email);
        triggerToast(student.name, student.email);
      }
    });
  });
}

function triggerToast(name, email) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <div style="font-size: 2rem;">👋</div> 
    <div>
      <div style="color: var(--teal); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">New Check-In</div>
      <strong style="font-size: 1.1rem; color: var(--navy);">${name}</strong><br>
      <small style="color: var(--muted);">${email}</small>
    </div>
  `;
  
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideOut 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards";
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

// ==========================================
// 📥 CLOSE CLASS & EXPORT CSV LOGIC
// ==========================================
closeSessionBtn.addEventListener("click", async () => {
  if (!confirm("Are you sure you want to close the class? No more students will be able to join.")) return;

  closeSessionBtn.textContent = "Exporting... ⏳";
  closeSessionBtn.disabled = true;

  try {
    await setDoc(doc(db, "sessions", currentSessionId), { isOpen: false }, { merge: true });

    let csvContent = "data:text/csv;charset=utf-8,Status,Name,Email,Time\n";
    
    const q = query(
      collection(db, "live_attendees"), 
      where("instructorId", "==", currentSessionId),
      where("sessionCode", "==", currentLiveCode)
    );
    const snapshot = await getDocs(q);
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const timeStr = new Date(data.timestamp).toLocaleTimeString();
      csvContent += `Present,"${data.name}","${data.email}","${timeStr}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_${currentSessionTitle.replace(/\s+/g, '_')}_${currentLiveCode}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    alert("✅ Class Closed and CSV Exported!");
    closeSessionBtn.textContent = "Session Closed 🔒";

  } catch (error) {
    console.error("Error exporting:", error);
    alert("⚠️ Error exporting CSV.");
    closeSessionBtn.disabled = false;
  }
});

// 🤖 Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service Worker registered! Scope:', reg.scope))
      .catch((err) => console.log('Service Worker registration failed:', err));
  });
}