// ==========================================
// 🔥 FIREBASE IMPORTS
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";


// ==========================================
// 🔗 FIREBASE CONFIGURATION
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyCOxB2OXsTD5m4KCHbxFNhWIjn_3JiZZHU",
  authDomain: "attendance-82604.firebaseapp.com",
  projectId: "attendance-82604",
  storageBucket: "attendance-82604.firebasestorage.app",
  messagingSenderId: "684977293672",
  appId: "1:684977293672:web:8c57936adc38a48d032edd"
};


// ==========================================
// 🚀 INITIALIZE FIREBASE
// ==========================================

const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);


// ==========================================
// 🎯 GRAB UI ELEMENTS
// ==========================================

const form = document.getElementById("studentCheckInForm");

const checkInBtn = document.getElementById("checkInBtn");

const studentLoginSection = document.getElementById(
  "studentLoginSection"
);

const heroText = document.querySelector(".hero p");

const nameInput = document.getElementById("studentName");

const emailInput = document.getElementById("studentEmail");

const codeInput = document.getElementById("liveAccessCode");

const toastContainer = document.getElementById("toastContainer");

const modalOverlay = document.getElementById("modalOverlay");

const modalIcon = document.getElementById("modalIcon");

const modalTitle = document.getElementById("modalTitle");

const modalBody = document.getElementById("modalBody");

const modalFooter = document.getElementById("modalFooter");


// ==========================================
// 📦 SESSION DATA
// ==========================================

let verifiedSessionData = null;

// The anonymous Firebase Auth UID for this device/browser.
// Populated once on load — stays stable across tabs and
// survives page refreshes. This is the hard-block key.
let anonUid = null;


// ==========================================
// 👤 SILENT ANONYMOUS SIGN-IN
// ==========================================
//
// Firebase Auth persists anonymous sessions in
// IndexedDB — not localStorage. This means:
//
//   ✅ Survives page refresh
//   ✅ Survives opening new tabs
//   ✅ Survives clearing localStorage manually
//   ✅ Same UID across all tabs in the same browser
//   ❌ New private/incognito window = new UID
//      (but that's the absolute limit without
//       a real login system)
//

onAuthStateChanged(auth, async (user) => {

  if (user) {

    // Existing anonymous session restored
    anonUid = user.uid;

  } else {

    // No session — create one silently
    try {

      const credential = await signInAnonymously(auth);

      anonUid = credential.user.uid;

    } catch (error) {

      console.error("Anonymous sign-in failed:", error);

      // Non-fatal: form will catch the missing UID on submit
    }

  }

});


// ==========================================
// 🔔 SHOW TOAST
// ==========================================
//
// type: "success" | "error" | "warning"
//

function showToast(message, type = "error") {

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️"
  };

  const toast = document.createElement("div");

  toast.className = `toast toast--${type}`;


  const icon = document.createElement("div");

  icon.style.fontSize = "1.6rem";

  icon.textContent = icons[type] ?? "ℹ️";


  const content = document.createElement("div");

  content.style.fontSize = "0.95rem";

  content.style.color = "var(--navy)";

  content.style.lineHeight = "1.5";

  content.textContent = message;


  toast.appendChild(icon);

  toast.appendChild(content);

  toastContainer.appendChild(toast);


  setTimeout(() => {

    toast.style.animation =
      "slideOut 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards";

    setTimeout(() => toast.remove(), 400);

  }, 4500);

}


// ==========================================
// 🪟 SHOW MODAL
// ==========================================
//
// For simple info/alert modals (one OK button),
// call: showModal({ icon, title, message })
//
// Returns a Promise that resolves when dismissed.
//

function showModal({ icon = "ℹ️", title, message }) {

  return new Promise((resolve) => {

    modalIcon.textContent = icon;

    modalTitle.textContent = title;

    modalBody.textContent = message;

    modalFooter.innerHTML = "";


    const okBtn = document.createElement("button");

    okBtn.textContent = "OK";

    okBtn.className = "modal-btn-confirm";

    okBtn.style.background = "var(--teal)";

    okBtn.addEventListener("click", () => {

      closeModal();

      resolve();

    });


    modalFooter.appendChild(okBtn);

    modalOverlay.classList.remove("hidden");

    okBtn.focus();

  });

}


// ==========================================
// 🔒 CLOSE MODAL
// ==========================================

function closeModal() {

  modalOverlay.classList.add("hidden");

  modalFooter.innerHTML = "";

}


// Close modal on overlay click (outside the box)
modalOverlay.addEventListener("click", (e) => {

  if (e.target === modalOverlay) {

    closeModal();

  }

});


// ==========================================
// 🔤 NORMALIZE SESSION CODE
// ==========================================

function normalizeSessionCode(code) {

  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}


// ==========================================
// 🆔 CREATE SAFE ATTENDANCE DOCUMENT ID
// ==========================================
//
// Format:
//
// instructorId_sessionCode_anonUID
//
// Example:
//
// abc123_AH-X7K92P_firebaseAnonUID456
//
// The anonUID is device-bound (persisted in
// IndexedDB by Firebase Auth). The same device
// cannot create a second attendance record for
// the same instructor/session, regardless of
// what name or email they enter.
//

function createAttendanceId(instructorId, sessionCode, uid) {

  return `${instructorId}_${sessionCode}_${uid}`;
}


// ==========================================
// 🔍 SESSION CODE LOOKUP
// ==========================================

let lookupTimeout;


codeInput.addEventListener("input", (e) => {

  clearTimeout(lookupTimeout);

  // Normalize input automatically
  const code = normalizeSessionCode(e.target.value);

  e.target.value = code;


  // New AccessHub code format:
  //
  // AH-XXXXX
  // AH-X7K92P
  //
  // Minimum 5 characters after AH-
  // Maximum 8 characters after AH-

  const codeRegex = /^AH-[A-Z0-9]{5,8}$/;


  if (codeRegex.test(code)) {

    lookupTimeout = setTimeout(() => {

      fetchClassPreview(code);

    }, 400);

  } else {

    verifiedSessionData = null;

    removePreviewBanner();
  }

});


// ==========================================
// 🔎 FETCH SESSION PREVIEW
// ==========================================

async function fetchClassPreview(code) {

  try {

    const sessionsQuery = query(

      collection(db, "sessions"),

      where("code", "==", code),

      where("isOpen", "==", true)

    );


    const sessionSnapshot = await getDocs(sessionsQuery);


    if (!sessionSnapshot.empty) {

      const sessionDoc = sessionSnapshot.docs[0];

      verifiedSessionData = {

        id: sessionDoc.id,

        ...sessionDoc.data()

      };


      showPreviewBanner(
        verifiedSessionData.sessionTitle
      );

    } else {

      verifiedSessionData = null;

      removePreviewBanner();
    }

  } catch (error) {

    console.error(
      "Session preview error:",
      error
    );

    verifiedSessionData = null;

    removePreviewBanner();
  }

}


// ==========================================
// 📚 SHOW CLASS PREVIEW
// ==========================================

function showPreviewBanner(title) {

  let banner = document.getElementById(
    "classPreviewBanner"
  );


  if (!banner) {

    banner = document.createElement("div");

    banner.id = "classPreviewBanner";


    banner.style.cssText = `
      background: var(--light);
      border: 2px solid var(--teal);
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
      animation: fadeIn 0.3s ease;
    `;


    codeInput.parentNode.parentNode.insertBefore(

      banner,

      codeInput.parentNode

    );

  }


  banner.innerHTML = `

    <span
      style="
        font-size: 0.85rem;
        color: var(--muted);
        text-transform: uppercase;
        display: block;
        font-weight: bold;
      "
    >
      Verified Live Session
    </span>

    <strong
      style="
        color: var(--navy);
        font-size: 1.1rem;
      "
    >
      📚 ${title}
    </strong>

  `;
}


// ==========================================
// 🗑️ REMOVE SESSION PREVIEW
// ==========================================

function removePreviewBanner() {

  const banner = document.getElementById(
    "classPreviewBanner"
  );


  if (banner) {

    banner.remove();

  }

}


// ==========================================
// 🔄 RESET BUTTON
// ==========================================

function resetButton() {

  checkInBtn.textContent = "Mark Me Present ✅";

  checkInBtn.disabled = false;
}


// ==========================================
// 📝 STUDENT CHECK-IN
// ==========================================

form.addEventListener(
  "submit",

  async (e) => {

    e.preventDefault();


    // ==========================================
    // 🔐 ENSURE ANONYMOUS AUTH IS READY
    // ==========================================
    //
    // If sign-in hasn't completed yet (slow network
    // on first load), block submission and explain.
    //

    if (!anonUid) {

      showToast(
        "Your session is still being set up. Please wait a moment and try again.",
        "warning"
      );

      return;
    }


    // ==========================================
    // ⏱️ RATE LIMITER
    // ==========================================

    const lastAttempt = localStorage.getItem(
      "last_checkin_attempt"
    );

    const now = Date.now();


    if (
      lastAttempt &&
      now - lastAttempt < 5000
    ) {

      showToast(
        "Please wait a few seconds before trying again.",
        "warning"
      );

      resetButton();

      return;
    }


    localStorage.setItem(
      "last_checkin_attempt",
      now
    );


    // ==========================================
    // 📥 GET FORM VALUES
    // ==========================================

    const name = nameInput.value.trim();

    const email = emailInput.value
      .trim()
      .toLowerCase();

    const code = normalizeSessionCode(
      codeInput.value
    );


    // ==========================================
    // 🔍 VALIDATE NAME
    // ==========================================

    const nameRegex = /^[a-zA-Z\s'-]{2,50}$/;


    if (!nameRegex.test(name)) {

      showToast(
        "Please enter a valid name using letters only.",
        "error"
      );

      nameInput.focus();

      resetButton();

      return;
    }


    // ==========================================
    // 📧 VALIDATE EMAIL
    // ==========================================

    // Slash is excluded because the email was
    // previously part of the Firestore document ID.
    // Keeping the restriction as a safe default.

    const emailRegex = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;


    if (!emailRegex.test(email)) {

      showToast(
        "Please enter a valid email address.",
        "error"
      );

      emailInput.focus();

      resetButton();

      return;
    }


    // ==========================================
    // 🔐 VALIDATE SESSION CODE
    // ==========================================

    const codeRegex = /^AH-[A-Z0-9]{5,8}$/;


    if (!codeRegex.test(code)) {

      showToast(
        "Invalid AccessHub session code.",
        "error"
      );

      codeInput.focus();

      resetButton();

      return;
    }


    // ==========================================
    // ⏳ LOADING STATE
    // ==========================================

    checkInBtn.textContent = "Verifying & Checking In... ⏳";

    checkInBtn.disabled = true;


    try {


      // ==========================================
      // 🔍 RE-VERIFY SESSION
      // ==========================================

      const sessionsQuery = query(

        collection(db, "sessions"),

        where("code", "==", code),

        where("isOpen", "==", true)

      );


      const sessionSnapshot = await getDocs(sessionsQuery);


      // No active session found
      if (sessionSnapshot.empty) {

        showToast(
          "Invalid session code or this session is currently closed.",
          "error"
        );

        resetButton();

        return;
      }


      const sessionDoc = sessionSnapshot.docs[0];

      const sessionData = sessionDoc.data();

      const instructorId = sessionData.instructorId;

      const sessionTitle = sessionData.sessionTitle || "Live Session";


      // ==========================================
      // ⏰ SESSION EXPIRY CHECK
      // ==========================================

      const threeHoursAgo = new Date(
        Date.now() - 3 * 60 * 60 * 1000
      ).toISOString();


      if (
        sessionData.createdAt &&
        sessionData.createdAt < threeHoursAgo
      ) {

        showToast(
          "This session has expired. Please ask your instructor for a new session code.",
          "error"
        );

        resetButton();

        return;
      }


      // ==========================================
      // 🆔 CREATE DETERMINISTIC ATTENDANCE ID
      // ==========================================
      //
      // The document ID is now keyed on the
      // anonymous UID — not the email.
      //
      // This means one device = one attendance
      // record per session, regardless of what
      // name or email is entered on that device.
      //

      const attendanceId = createAttendanceId(
        instructorId,
        code,
        anonUid
      );


      // ==========================================
      // 🛡️ CREATE ATTENDANCE RECORD
      // ==========================================
      //
      // setDoc with a deterministic ID.
      //
      // Firestore Rules enforce:
      //   - request.auth != null (anon auth)
      //   - document ID = instructorId_code_anonUID
      //   - no document with this ID already exists
      //     (create-only, no update allowed)
      //
      // This gives us database-level hard blocking.
      //

      const attendanceRef = doc(
        db,
        "live_attendees",
        attendanceId
      );


      await setDoc(attendanceRef, {

        instructorId: instructorId,

        name: name,

        email: email,

        sessionCode: code,

        sessionTitle: sessionTitle,

        // deviceId stored for audit trail —
        // lets instructor see if suspicious
        // patterns emerge (same UID, diff emails)
        deviceId: anonUid,

        timestamp: new Date().toISOString()

      });


      // ==========================================
      // 🎉 SUCCESS UI
      // ==========================================

      studentLoginSection.innerHTML = `

        <div
          style="
            padding: 40px;
            text-align: center;
          "
        >

          <h2
            style="
              font-size: 5rem;
              margin-bottom: 20px;
              animation: fadeIn 0.5s ease;
            "
          >
            ✅
          </h2>


          <h3
            style="
              color: var(--teal);
              margin-bottom: 10px;
              font-size: 1.5rem;
            "
          >
            You're checked in, ${name}!
          </h3>


          <p
            style="
              color: var(--navy);
              font-weight: bold;
              margin-bottom: 10px;
            "
          >
            📚 ${sessionTitle}
          </p>


          <p
            style="
              color: var(--muted);
              margin-bottom: 25px;
            "
          >
            Your attendance has been successfully recorded.
            You can now close this page.
          </p>


          <button

            onclick="location.reload();"

            style="
              max-width: 250px;
              margin: 0 auto;
              background: var(--navy);
            "

          >

            Back to Check-In 🔄

          </button>

        </div>

      `;


      heroText.textContent =
        "Attendance successfully verified. Enjoy the session!";


    } catch (error) {


      console.error("Check-in error:", error);


      // ==========================================
      // 🚫 HANDLE DUPLICATE / SECURITY ERRORS
      // ==========================================

      if (error.code === "permission-denied") {

        showToast(
          "You have already marked attendance for this session on this device.",
          "warning"
        );

      } else {

        showToast(
          "Connection error. Please check your internet and try again.",
          "error"
        );

      }


      resetButton();

    }

  }

);


// ==========================================
// 📱 PWA SERVICE WORKER
// ==========================================

if ("serviceWorker" in navigator) {

  window.addEventListener("load", () => {

    navigator.serviceWorker
      .register("/sw.js")

      .then((registration) => {

        console.log(
          "Service Worker registered! Scope:",
          registration.scope
        );

      })

      .catch((error) => {

        console.log(
          "Service Worker registration failed:",
          error
        );

      });

  });

}
