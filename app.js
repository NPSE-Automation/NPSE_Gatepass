// MAGIC BRIDGE: हा कोड ऑटोमॅटिकली तुझे सर्व जुने google.script.run कॉल्स इंटरनेटवर (Netlify) कन्व्हर्ट करेल!
const GOOGLE_API_URL = "https://script.google.com/a/macros/npse.co.in/s/AKfycbx11poC2Xv57yafkd1VNALE9mrxqX45RA8ZwCXVht4Ab-JhUCl3C5KXuMdxHdYqbvMH/exec";

window.google = {
    script: {
        run: getRunner(null, null)
    }
};

function getRunner(onSuccess, onFailure) {
    return new Proxy({}, {
        get: function(target, prop) {
            if (prop === 'withSuccessHandler') return function(cb) { return getRunner(cb, onFailure); };
            if (prop === 'withFailureHandler') return function(cb) { return getRunner(onSuccess, cb); };
            
            return function(...args) {
                fetch(GOOGLE_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: prop, args: args })
                })
                .then(r => r.json())
                .then(data => { if (onSuccess) onSuccess(data); })
                .catch(err => { if (onFailure) onFailure(err); });
            };
        }
    });
}

/**
 * PROJECT: NPSE Gatepass System - Logic Script (CLEANED & UPDATED)
 * -------------------------------------------
 */

// --- 1. GLOBAL VARIABLES ---
var currentPassId = "";
var userLat = null;
var userLng = null;
var capturedPhotoBase64 = "";

// --- GLOBAL CACHE MEMORY ---
let cachedEmployeeLogs = [];
let cachedVisitorLogs = [];
let currentDashMode = 'emp';
let alreadyNotifiedPasses = [];

// --- 2. APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', function() {
  
  var loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', processLogin);
  }

  var regBtn = document.getElementById('regBtn');
  if (regBtn) {
    regBtn.addEventListener('click', processRegister);
  }

  var toReg = document.getElementById('toReg');
  if (toReg) toReg.addEventListener('click', function(e) { 
    e.preventDefault(); 
    switchView('reg'); 
  });

  var toLog = document.getElementById('toLog');
  if (toLog) toLog.addEventListener('click', function(e) { 
    e.preventDefault(); 
    switchView('log'); 
  });
});

// --- 3. LOGIN & SESSION MANAGEMENT ---

function checkAutoLogin() {
  // STRICT PERMANENT MEMORY CHECK (Ignores sessionStorage)
  const savedId = localStorage.getItem('emp_id');
  const savedRole = localStorage.getItem('emp_role');

  if (savedId && savedRole) {
    // If memory exists, skip login and route them instantly!
    if (savedRole === "Master Admin" || savedRole === "Admin" || savedRole === "Dept Head") {
      showAdminPage();
    } else {
      showEmployeePage(); 
    }
  } else {
    // Only show login if they explicitly clicked Logout and cleared the memory
    switchView('log');
  }
}

function processLogin() {
  // 1. First, we must find the HTML elements on your page
  var idElement = document.getElementById('l_id');
  var passElement = document.getElementById('l_pass');
  var btn = document.getElementById('loginBtn');

  // Safety Check: If these don't exist, stop immediately
  if (!idElement || !passElement || !btn) { 
    console.error("Login elements not found in HTML."); 
    return; 
  }

  // 2. DEFINE THE VARIABLES (This fixes your 'id is not defined' error)
  var id = idElement.value.toUpperCase().trim();
  var pass = passElement.value;
  
  // Validation
  if (!id || !pass) {
    alert("Please enter both ID and Password.");
    return;
  }

  // 3. Visual feedback for the user
  btn.innerText = "VERIFYING...";
  btn.disabled = true;

  // 4. Run the backend check
  google.script.run
    .withSuccessHandler(function(response) {
      // Reset button state
      btn.innerText = "LOGIN";
      btn.disabled = false;
      
      if (response && response.status === "Success") {
        // 5. Save the credentials to memory (Now 'id' is defined!)
        localStorage.setItem('emp_id', id);
        localStorage.setItem('empName', response.name);
        localStorage.setItem('emp_role', response.role); 
        
        // 6. DASHBOARD ROUTER: Sends you to the right page
       if (response.role === "Master Admin" || response.role === "Admin" || response.role === "Dept Head") { 
             // Save their department to memory so we know what to filter later!
             localStorage.setItem('empDept', response.dept); 
             showAdminPage(); 
              }else {
          showEmployeePage();
        }
      } else {
        alert("Login Failed: Invalid ID or Password");
      }
    })
    .withFailureHandler(function(error) {
      btn.innerText = "LOGIN";
      btn.disabled = false;
      alert("Server Error. Please check your connection.");
      console.error("Login Error: ", error);
    })
    .loginUser(id, pass); 
}

function logoutUser() {
  // 1. Wipe all permanent and temporary memory
  localStorage.clear();
  sessionStorage.clear(); 
  
  // 2. Clear the login boxes
  if(document.getElementById('l_id')) document.getElementById('l_id').value = "";
  if(document.getElementById('l_pass')) document.getElementById('l_pass').value = "";
  
  // 3. 🛑 SILENTLY KILL THE GHOST RADARS
  // This stops the timers without refreshing the page!
  if (typeof adminPollInterval !== 'undefined' && adminPollInterval) {
      clearInterval(adminPollInterval);
  }
  if (typeof window.statusIntervalTimer !== 'undefined' && window.statusIntervalTimer) {
      clearInterval(window.statusIntervalTimer);
  }
  if (typeof lockoutInterval !== 'undefined' && lockoutInterval) {
      clearInterval(lockoutInterval);
  }
  
  // 4. Smoothly slide back to the Login Screen
  switchView('log'); 
}

// --- 4. REGISTRATION & PHOTO ---

function processRegister() {
  var name = document.getElementById('r_name').value;
  var dept = document.getElementById('r_dept').value;
  var pass = document.getElementById('r_pass').value;
  var imageData = document.getElementById('r_imageData').value; 
  
  if (!name || !dept || pass.length < 6) {
    alert("Please fill all fields. Password must be 6+ chars.");
    return;
  }

  if (!imageData || imageData === "") {
    alert("Please upload a Profile Photo before creating an account!");
    return;
  }

  var btn = document.getElementById('regBtn');
  btn.innerText = "CREATING...";
  btn.disabled = true;

  var data = {
    empId: document.getElementById('r_id').value,
    fullName: name,
    dept: dept,
    password: pass,
    image: imageData 
  };

  google.script.run
    .withSuccessHandler(function(res) {
      btn.innerText = "CREATE ACCOUNT";
      btn.disabled = false;
      if(res && res.status === "Success") {
        alert(res.message);
        switchView('log');
      } else {
        alert("Registration failed: " + res.message);
      }
    })
    .registerUser(data);
}

function previewImage(input) {
  var preview = document.getElementById('regPhotoPreview');
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) { 
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var MAX_SIZE = 200;
        var width = img.width;
        var height = img.height;
        if (width > height) { 
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else { 
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } 
        }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        var compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        preview.src = compressedBase64; 
        preview.style.display = 'block'; 
        document.getElementById('r_imageData').value = compressedBase64; 
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// --- 5. GATEPASS REQUEST & FLOW ---

function toggleDescription() {
  var reason = document.getElementById('g_reason').value;
  var descContainer = document.getElementById('descContainer');
  if(descContainer) descContainer.style.display = (reason === 'Personal Work' || reason === 'Official Visit' || reason === 'Early Exit') ? 'block' : 'none';
  
  var boxOutTime = document.getElementById('boxOutTime');
  var boxDuration = document.getElementById('boxDuration');
  var boxExpReturn = document.getElementById('boxExpReturn');
  var boxShiftEnd = document.getElementById('boxShiftEnd'); // 🚀 NEW
  
  if (reason === 'Early Exit') {
    if(boxOutTime) boxOutTime.style.display = 'block';
    if(boxDuration) boxDuration.style.display = 'none';
    if(boxExpReturn) boxExpReturn.style.display = 'none'; 
    if(boxShiftEnd) boxShiftEnd.style.display = 'block'; // Show specific Shift End box
  } else if (reason === 'Field Work (All-Day)') {
    if(boxOutTime) boxOutTime.style.display = 'none'; 
    if(boxDuration) boxDuration.style.display = 'none';
    if(boxExpReturn) boxExpReturn.style.display = 'none';
    if(boxShiftEnd) boxShiftEnd.style.display = 'none';
  } else {
    if(boxOutTime) boxOutTime.style.display = 'block';
    if(boxDuration) boxDuration.style.display = 'block';
    if(boxExpReturn) boxExpReturn.style.display = 'block';
    if(boxShiftEnd) boxShiftEnd.style.display = 'none';
  }
}


function requestPass() {
  try {
    var btn = document.getElementById('reqBtn');
    var reason = document.getElementById('g_reason').value;
    var time = document.getElementById('g_time').value; 
    var expReturn = document.getElementById('g_exp_return') ? document.getElementById('g_exp_return').value : ""; 
    
    var empId = localStorage.getItem("emp_id") || sessionStorage.getItem("emp_id") || (document.getElementById('l_id') ? document.getElementById('l_id').value : "");

    if (!empId || empId === "") {
      alert("Session Error: We lost your Employee ID. Please log out and log back in.");
      return;
    }

    var role = sessionStorage.getItem('emp_role') || localStorage.getItem('emp_role');
    if (role === "Admin" || role === "Master Admin") {
      alert("Admins are not permitted to raise gatepasses.");
      return;
    }

    // Check required fields
    if (!reason || (!time && reason !== 'Field Work (All-Day)')) { 
      alert("Please select a reason and an Out Time."); 
      return; 
    }

    // 🚀 Check Shift End Time before submitting
    var shiftEnd = document.getElementById('g_shift_end') ? document.getElementById('g_shift_end').value : "";
    if (reason === 'Early Exit' && !shiftEnd) {
      alert("Please enter your Normal Shift End Time.");
      return;
    }
    
    // Auto-fill time/duration for special passes to prevent crashes
  if (reason === 'Field Work (All-Day)') {
    let d = new Date();
    time = d.getHours().toString().padStart(2, '0') + ":" + d.getMinutes().toString().padStart(2, '0');
    document.getElementById('g_duration').value = 14; // Default 14 hours for all day
  }

    if (expReturn && expReturn <= time && reason !== 'Early Exit' && reason !== 'Field Work (All-Day)') {
      alert("⚠️ Invalid Time: Your Expected Return time must be later than your Out Time.");
      document.getElementById('g_exp_return').value = ""; 
      return; 
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';

    var formData = {
      empId: empId,
      name: document.getElementById('userName') ? document.getElementById('userName').innerText : "",
      dept: document.getElementById('userDept') ? document.getElementById('userDept').innerText : "",
      reason: reason, 
      desc: document.getElementById('g_desc') ? document.getElementById('g_desc').value : "", 
      time: time,
      duration: document.getElementById('g_duration') ? document.getElementById('g_duration').value : 1,
      expReturn: expReturn,
      shiftEnd: shiftEnd // 🚀 NEW: Add to server payload
    };

    google.script.run
      .withSuccessHandler(function(res) {
        if(res && res.status === "Success") {
          var raiseSec = document.getElementById('raiseTicketSection');
          if(raiseSec) raiseSec.classList.add('d-none');
          
          var pendingSec = document.getElementById('pendingSection');
          if(pendingSec) {
            pendingSec.classList.remove('d-none');
            pendingSec.style.display = 'block';
          }
          
          if (typeof startStatusChecker === "function") {
             startStatusChecker();
          }
        } else { 
          alert("Error: " + (res ? res.message : "Server error")); 
          btn.disabled = false; 
          btn.innerHTML = "SUBMIT REQUEST"; 
        }
      })
      .withFailureHandler(function(err) {
          alert("Connection Error: " + err.message);
          btn.disabled = false; 
          btn.innerHTML = "SUBMIT REQUEST"; 
      })
      .submitGatepass(formData);

  } catch (error) {
    // CRASH PROTECTOR: Un-freezes the button if the browser glitches!
    alert("System Error: " + error.message);
    var btnCrash = document.getElementById('reqBtn');
    if (btnCrash) {
      btnCrash.disabled = false;
      btnCrash.innerHTML = "SUBMIT REQUEST";
    }
  }
}

function startStatusChecker() {
  var empId = sessionStorage.getItem("emp_id") || localStorage.getItem("emp_id");
  if (window.statusIntervalTimer) clearInterval(window.statusIntervalTimer);
  
  window.statusIntervalTimer = setInterval(function() {
    google.script.run.withSuccessHandler(function(res) {
      if (res) {
        let stat = res.status.toUpperCase();
        // 🚀 जर स्टेटस APPROVED, FIELD-IN किंवा FIELD-OUT झाला तर मॅन्युअल रिफ्रेश न करता ऑटो-लोकल पेज लोड होईल
        if (stat === "APPROVED" || stat === "FIELD-IN" || stat === "FIELD-OUT") {
          clearInterval(window.statusIntervalTimer);
          showEmployeePage(); 
        } else if (stat === "REJECTED") {
          clearInterval(window.statusIntervalTimer);
          alert("Your Gatepass request was REJECTED by the Admin.");
          showEmployeePage();
        }
      }
    }).checkPassStatus(empId);
  }, 5000);
}

function showPunchOutUI(passId) {
  currentPassId = passId;
  
  // CRITICAL FIX: Save the ID so the processPunchOut() function knows what to punch out!
  localStorage.setItem('activePassId', passId);
  
  // Force hide the pending spinner
  const pendingSec = document.getElementById('pendingSection');
  if (pendingSec) {
    pendingSec.classList.add('d-none');
    pendingSec.style.setProperty('display', 'none', 'important');
  }
  
  // Force show the Punch Out button
  const poSection = document.getElementById('punchOutSection');
  if(poSection) {
    poSection.classList.remove('d-none');
    poSection.style.setProperty('display', 'block', 'important');
    
    // SAFETY RESET: Ensure the button isn't stuck on "VERIFYING..." from a previous attempt
    const btn = poSection.querySelector('button');
    if (btn) {
        btn.innerText = "PUNCH OUT NOW";
        btn.disabled = false;
    }
  }
  
  if(document.getElementById('passCardId')) {
    document.getElementById('passCardId').innerText = currentPassId;
  }
}

function processPunchOut(e) {
  // FOOLPROOF BUTTON GRAB: Guarantees we get the button even if they click the text inside it
  const btn = e ? e.target.closest('button') : document.getElementById('btnPunchOut');
  
  if (!btn) {
    console.error("Button element not found!");
    return;
  }

  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> 🛰️ VERIFYING...';
  btn.disabled = true;

  try {
    // Use High Accuracy to ensure they aren't using "Mock Locations"
    navigator.geolocation.getCurrentPosition(function(pos) {
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;

      const passId = localStorage.getItem('activePassId');

      // Send ID + LAT + LNG to the backend
      google.script.run
        .withSuccessHandler(function(res) {
          if(res.status === "Success") {
            
            if (res.special === "EarlyExit") {
                alert("✅ Authorized Early Exit. Please show this card to the gatekeeper.");
                document.getElementById('punchOutSection').style.setProperty('display', 'none', 'important');
                let activeView = document.getElementById('activePassView');
                activeView.classList.remove('d-none');
                activeView.style.display = 'block';
                
                // HIDE the punch-in/return panel completely since they are going home
                let returnPanel = document.getElementById('returnPanelUI');
                if (returnPanel) returnPanel.style.display = 'none';
                
                // Populating all the necessary profile fields
                document.getElementById('displayPassId').innerText = res.passId;
                document.getElementById('displayName').innerText = res.name;
                document.getElementById('displayDept').innerText = res.dept || "Employee";
                document.getElementById('displayApprover').innerText = res.approver || "System Admin";
                
               // Replacing the missing expected return time with a clean label
                document.getElementById('displayAcceptTime').innerText = "N/A (Going Home)"; 
                document.getElementById('displayOutTime').innerText = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                // 🚀 NEW: Unhide the Shift End row and inject the time!
                let shiftEndRow = document.getElementById('rowShiftEnd');
                if (shiftEndRow) {
                    shiftEndRow.classList.remove('d-none');
                    shiftEndRow.classList.add('d-flex');
                    document.getElementById('displayShiftEnd').innerText = res.shiftEnd || "--:--";
                }
                
                let badge = document.querySelector('#activePassView .badge.bg-danger');
                if (badge) {
                    badge.innerText = "EXIT PASS";
                    badge.classList.replace('bg-danger', 'bg-dark');
                }
                
                // CREATE AND SHOW A "RETURN TO DASHBOARD" BUTTON
                if (!document.getElementById('backHomeBtn')) {
                    let btnHtml = '<button id="backHomeBtn" class="btn btn-dark w-100 py-3 fw-bold rounded-pill shadow-sm mt-4" style="max-width:380px; margin: 0 auto; display: block;" onclick="showEmployeePage()"><i class="bi bi-house-door-fill me-2"></i> RETURN TO DASHBOARD</button>';
                    activeView.insertAdjacentHTML('beforeend', btnHtml);
                } else {
                    document.getElementById('backHomeBtn').style.display = 'block';
                }
            } else if (res.special === "FieldWork") {
                alert("✅ Field Work Started! You can toggle your status all day from your dashboard.");
                showEmployeePage();
            } else {
                alert("✅ Authorization Successful. Have a safe journey!");
                showEmployeePage(); 
            }
            
          } else {
            // 1. If it's already out, silently fast-forward to the ID card without a scary popup!
            if (res.message === "Already OUT." || res.message === "Already completed.") {
                showEmployeePage();
                return; 
            }
            
            // 2. Only show an alert box for REAL errors
            alert("⚠️ Gatepass Status: " + (res.message || "Unknown error encountered.")); 
            btn.innerText = "PUNCH OUT NOW";
            btn.disabled = false;
          }
        })
        // Fix 3: ADDED FAILURE HANDLER - If the Google server crashes, unlock the button!
        .withFailureHandler(function(error) {
          alert("🚨 Server Connection Error: " + error.message);
          btn.innerText = "PUNCH OUT NOW";
          btn.disabled = false;
        })
        .markPunchOut(passId, userLat, userLng);

    }, function(err) {
      alert("GPS Error: You must enable Location to Punch Out.");
      btn.disabled = false;
      btn.innerText = "PUNCH OUT NOW";
    }, { enableHighAccuracy: true, timeout: 10000 });

  } catch (err) {
    // Fix 4: If the browser strictly blocks GPS before it even starts, catch it here
    alert("Browser Error: Location services are blocked or unavailable.");
    btn.disabled = false;
    btn.innerText = "PUNCH OUT NOW";
  }
}

// --- 6. PUNCH-IN (GPS & CAMERA) ---

function startPunchInVerification() {
  const btn = document.getElementById('btnPunchIn');
  const geoText = document.getElementById('geoStatus');
  
  if(btn) {
    btn.disabled = true;
    btn.innerHTML = "🛰️ Verifying GPS...";
  }

  navigator.geolocation.getCurrentPosition(function(pos) {
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;
    
    // ==========================================
    // 🛑 STRICT GEOFENCE CHECK
    // ==========================================
    const companyLat = 19.835234; // Your company Latitude
    const companyLng = 75.247356; // Your company Longitude
    const safeDistance = 100; // Meters
    
    // Calculate how far the employee is from the company right now
    const distanceMeters = calculateDistance(userLat, userLng, companyLat, companyLng);
    
    if (distanceMeters > safeDistance) {
        // PUNCH IN REJECTED: They are too far away!
        alert(`Geofence Alert: You are ${Math.round(distanceMeters)} meters away. You must be within ${safeDistance}m of the company to punch in.`);
        
        if(geoText) geoText.innerHTML = '<span class="text-danger fw-bold">❌ Return to company to punch in.</span>';
        if(btn) {
          btn.disabled = false;
          btn.innerHTML = "RETRY GPS";
        }
        return; 
    }
    // ==========================================

    // GPS Verified! 
    if(geoText) geoText.innerHTML = "✅ GPS Verified.";
    
    // Change button text so they know it worked
    if(btn) {
      btn.disabled = true; // Keep it disabled so they don't spam GPS
      btn.innerHTML = "<i class='bi bi-check-circle-fill me-2'></i> LOCATION VERIFIED";
      btn.classList.replace('btn-primary', 'btn-success');
    }

    // Check if photo is already taken to unlock final submit
    checkVerificationComplete();
    
  }, function(err) {
    alert("GPS Permission Denied or Timed Out.");
    if(btn) {
      btn.disabled = false;
      btn.innerHTML = "RETRY GPS";
    }
  }, { enableHighAccuracy: true });
}

// THE LOW-MEMORY OPTIMIZED CAMERA PROCESSOR
function processCapturePhoto(e) {
  const file = e.target.files[0];
  if (!file) return;

  const status = document.getElementById('geoStatus');
  if(status) status.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span> Optimizing Photo...';

  // 1. Free memory of any previous photo
  capturedPhotoBase64 = "";
  const preview = document.getElementById('capturePreview');
  if(preview) {
    preview.src = ""; 
    preview.classList.add('d-none');
  }

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);

  img.onload = function() {
    URL.revokeObjectURL(objectUrl);
    const canvas = document.createElement('canvas');
    
    // 2. Aggressive resize for mobile memory safety (Max Width 200)
    const MAX_WIDTH = 200; 
    const scale = MAX_WIDTH / img.width;
    canvas.width = MAX_WIDTH;
    canvas.height = img.height * scale;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // 3. Compress heavily (0.4)
    capturedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.4);
    
    if(preview) {
      preview.src = capturedPhotoBase64;
      preview.classList.remove('d-none');
      preview.style.display = "block";
    }
    
    if(status) status.innerHTML = '<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Photo Verified</span>';
    checkVerificationComplete();

    // 4. Manual Garbage Collection (Forces phone to release RAM)
    canvas.width = 0;
    canvas.height = 0;
    ctx.clearRect(0, 0, 0, 0);
    img.src = ""; 
    img.onload = null;
  };

  img.onerror = function() {
    alert("Memory Error: Image too large. Please lower your camera resolution or try again.");
    if(status) status.innerHTML = '<span class="text-danger fw-bold">Photo Error</span>';
  };

  img.src = objectUrl;
}

function checkVerificationComplete() {
  const finalBtn = document.getElementById('finalPunchInBtn');
  const verifyBtn = document.getElementById('btnPunchIn');
  
  if (userLat && userLng && capturedPhotoBase64 && finalBtn) {
    finalBtn.disabled = false;
    finalBtn.classList.remove('d-none');
    if(verifyBtn) verifyBtn.classList.add('d-none');
  }
}

function processPunchIn() {
  const finalBtn = document.getElementById('finalPunchInBtn');
  if(!capturedPhotoBase64 || !userLat) {
    alert("Please verify Location and Photo first!");
    return;
  }
  
  finalBtn.disabled = true;
  finalBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';

  google.script.run
    .withSuccessHandler(function(res) {
      if (res && res.status === "Success") {
        alert("✅ Punch-in Successful! Welcome back.");
        
        if(document.getElementById('g_reason')) document.getElementById('g_reason').value = "";
        if(document.getElementById('g_desc')) document.getElementById('g_desc').value = "";
        if(document.getElementById('g_time')) document.getElementById('g_time').value = "";
        
        // 🚀 THE MAGIC FLAG: सिस्टीमला सांगा की युजर ब्रेकवरून परत आलाय!
        localStorage.setItem('returnedFromBreak', 'true');
        
        showEmployeePage(); 
        
      } else {
        alert(res ? res.message : "Error during Punch-In");
        finalBtn.disabled = false;
        finalBtn.innerHTML = "<i class='bi bi-check-circle-fill me-2'></i> CONFIRM RETURN";
      }
    })
    .markPunchIn(currentPassId, userLat, userLng, capturedPhotoBase64);
}

// --- 7. ADMIN CONTROLS ---

/** * UPDATED LIST LOADER (For modern, professional sidebar look)
 */
function loadSubAdminTable() {
  google.script.run.withSuccessHandler(function(users) {
    // The main container in the sidebar
    const tbody = document.getElementById('subAdminList'); 
    if(!tbody) return;
    tbody.innerHTML = ""; 
    
    let adminCount = 0;
    
    // 'users' is the array of all users from your User_DB
    users.forEach(user => {
      if(user.role === "Admin") {
        adminCount++;
        
        // NEW PROFESSIONAL LIST ITEM FORMAT (Instead of table rows)
        tbody.innerHTML += `
          <div id="row-${user.id}" class="card border-0 shadow-sm rounded-3">
            <div class="card-body p-3 d-flex justify-content-between align-items-center">
              <div>
                <b class="text-dark d-block">${user.name}</b>
                <small class="text-muted d-block" style="font-size: 0.75rem;"><i class="bi bi-key-fill me-1"></i>ID: ${user.id}</small>
                </div>
              <div class="text-end">
                <button class="btn btn-outline-danger btn-sm rounded-circle border-0" title="Revoke Access" onclick="deleteAdmin('${user.id}')">
                  <i class="bi bi-trash-fill fs-6"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }
    });
    
    // Fallback if no sub-admins exist
    if(adminCount === 0) {
      tbody.innerHTML = `
        <div class="text-center bg-white shadow-sm rounded-3 py-5 text-muted">
           <i class="bi bi-person-x fs-1 opacity-50"></i>
           <p class="mt-2 mb-0 fw-bold">No sub-admins found.</p>
           <small>Use the form above to authorize personnel.</small>
        </div>
      `;
    }
  }).getAllUsers(); 
}

function deleteAdmin(adminId) {
  if (confirm("Are you sure you want to remove access for Admin ID: " + adminId + "?")) {
    const row = document.getElementById('row-' + adminId);
    if(row) row.style.opacity = "0.5";

    google.script.run.withSuccessHandler(function(res) {
      alert(res.message);
      if (res.status === "Success") {
        loadSubAdminTable();
      } else {
        if(row) row.style.opacity = "1"; 
      }
    }).removeAdmin(adminId);
  }
}

function submitNewAdmin() {
  var id = document.getElementById('m_adminId').value.trim();
  var name = document.getElementById('m_adminName').value.trim();
  var email = document.getElementById('m_adminEmail').value.trim();
  
  if(!id || !name || !email) {
    return alert("Please enter the Admin ID, Full Name, and Email Address.");
  }
  if(!email.includes("@")) {
    return alert("Please enter a valid email address.");
  }

  var btn = document.querySelector('button[onclick="submitNewAdmin()"]');
  if (btn) {
    btn.innerText = "PROCESSING...";
    btn.disabled = true;
  }

  var payload = { id: id, name: name, email: email, dept: "Management" };

  google.script.run.withSuccessHandler(function(res) {
    alert(res.message);
    document.getElementById('m_adminId').value = "";
    document.getElementById('m_adminName').value = "";
    document.getElementById('m_adminEmail').value = "";
    if (btn) {
      btn.innerText = "AUTHORIZE";
      btn.disabled = false;
    }
    if(res.status === "Success") {
      loadSubAdminTable();
    }
  }).createSubAdmin(payload);
}

function approvePass(passId) {
  const adminName = localStorage.getItem('empName') || "Unknown Admin";
  
  // 1. Safely grab the exact button they just clicked
  const clickedButton = event.target.closest('button') || event.target;
  
  // 2. Instantly change the UI so they know it's working
  clickedButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Processing...';
  clickedButton.disabled = true;

google.script.run
    .withSuccessHandler(function(res) {
       if(res && res.status === "Success") {
         
         // 🚀 INSTANT UI UPDATE: Turn the button into a Green Badge!
         clickedButton.innerHTML = "✅ APPROVED";
         clickedButton.className = "badge bg-success py-2 px-3 fs-6"; 
         
         let actionContainer = clickedButton.parentElement;
         let allButtons = actionContainer.querySelectorAll('button');
         allButtons.forEach(btn => {
            if (btn !== clickedButton) btn.style.display = 'none';
         });

         setTimeout(loadAdminDashboard, 2000); 

       } else if (res && res.status === "AlreadyProcessed") {
         
         alert("⚠️ Notice: This gatepass was already marked as " + res.current + ".");
         loadAdminDashboard();
         
       } else {
         
         alert("❌ Database Error: " + (res ? res.message : "Unknown failure."));
         loadAdminDashboard(); 
         
       }
    })
    .withFailureHandler(function(error) {
       alert("🚨 Critical Server Error: " + error.message);
       loadAdminDashboard();
    })
    .updatePassStatus(passId, "APPROVED", adminName);
}


function rejectPass(passId) {
  const adminName = localStorage.getItem('empName') || "Unknown Admin";
  
  if(confirm("Are you sure you want to REJECT this gatepass?")) {
    const clickedButton = event.target.closest('button') || event.target;
    
    clickedButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Processing...';
    clickedButton.disabled = true;

    google.script.run
      .withSuccessHandler(function(res) {
         if(res && res.status === "Success") {
           
           // 🚀 INSTANT UI UPDATE: Turn the button into a Red Badge!
           clickedButton.innerHTML = "❌ REJECTED";
           clickedButton.className = "badge bg-danger py-2 px-3 fs-6";
           
           // Hide other buttons
           let actionContainer = clickedButton.parentElement;
           let allButtons = actionContainer.querySelectorAll('button');
           allButtons.forEach(btn => {
              if (btn !== clickedButton) btn.style.display = 'none';
           });

           // Silently refresh in the background
           setTimeout(loadAdminDashboard, 2000);

         } else {
           alert("❌ Database Error: " + (res ? res.message : "Unknown failure."));
           loadAdminDashboard();
         }
      })
      .withFailureHandler(function(error) {
         alert("🚨 Critical Server Error: " + error.message);
         loadAdminDashboard();
      })
      .updatePassStatus(passId, "REJECTED", adminName);
  }
}

// --- MISSING FUNCTION ADDED HERE ---
function clearFilters() {
  // 1. Target all text, date, and select inputs EXCEPT the main globalTimeFilter
  const filterInputs = document.querySelectorAll('#adminDashView input[type="text"], #adminDashView input[type="date"], #adminDashView select:not(#globalTimeFilter)');
  filterInputs.forEach(input => input.value = '');
  
  // 2. Reset Status Pills
  document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
  const allPill = document.querySelector('.all-pill');
  if(allPill) allPill.classList.add('active');
  const fStatus = document.getElementById('f_status');
  if(fStatus) fStatus.value = "";
  
  // 3. Refresh to recalculate
  refreshCurrentDashboard();
}

function loadAdminDashboard() {
  const loader = document.getElementById('adminLoader');
  const tableContainer = document.getElementById('adminTableContainer');

  // 🕒 NEW: Grab the Time Filter value (Defaults to 'today' if not found)
  const timeFilterElement = document.getElementById('globalTimeFilter');
  const timeFrame = timeFilterElement ? timeFilterElement.value : 'today';

  // Only show the big loader if we don't have a table loaded yet (prevents flickering)
  const currentTable = document.getElementById('adminTableBody');
  if (!currentTable || currentTable.innerHTML === "") {
      if(loader) loader.classList.remove('d-none');
      if(tableContainer) tableContainer.classList.add('d-none');
  }

  google.script.run.withSuccessHandler(function(response) {
    const tbody = document.getElementById('adminTableBody');
    if(!tbody) return;
    tbody.innerHTML = "";

    // 🚀 NEW: Added ontimeCount and lateCount to your existing variables
    let outCount = 0, returnsCount = 0, ontimeCount = 0, lateCount = 0;

    if (!response || response.status === "empty" || !response.data || response.data.length === 0) {
      tbody.innerHTML = "<tr><td colspan='6' class='text-center py-4 text-muted'>No gatepasses found.</td></tr>";
    } else {
      
      let approverSearch = "";
      const approverInput = document.getElementById('filterApprover');
      if (approverInput) {
        approverSearch = approverInput.value.toLowerCase().trim();
      }

      // ==========================================
      // SMART SORTING: Pending ALWAYS on Top!
      // ==========================================
      // 1. First, reverse the data so the newest passes are naturally at the top
      let processedData = response.data.slice().reverse(); 
      
      // 2. Next, force any pass with "PENDING" status to jump to the very front of the line
      processedData.sort(function(a, b) {
        let aIsPending = (a.status || "").toUpperCase() === "PENDING";
        let bIsPending = (b.status || "").toUpperCase() === "PENDING";
        
        if (aIsPending && !bIsPending) return -1; // 'a' moves up
        if (!aIsPending && bIsPending) return 1;  // 'b' moves up
        return 0; // If they are both pending (or both not pending), keep their newest-first order
      });

      // 3. Now draw the table going forwards through our freshly sorted list
      for(let i = 0; i < processedData.length; i++) {
        let rec = processedData[i];
        let statUp = (rec.status || "").toUpperCase();
        let recApprover = (rec.approver || "").toLowerCase();

        // ==========================================
        // 🚀 MULTI-DEPT SMART FILTER
        // ==========================================
        let myRole = localStorage.getItem('emp_role') || "";
        let myDept = localStorage.getItem('empDept') || "";
        
        // If I am a Dept Head, activate the multi-bouncer!
        if (myRole === "Dept Head") {
            let ticketDept = (rec.dept || "").toUpperCase().trim();
            
            // This turns "Production, Quality" into "PRODUCTION, QUALITY"
            let adminDeptList = myDept.toUpperCase(); 
            
            // If the Admin's list of departments does NOT include this ticket's department, hide it!
            if (!adminDeptList.includes(ticketDept)) {
                 continue; // Skips this row and hides the ticket!
            }
        }
        // ==========================================
        // Check Approver Filter
        if (approverSearch !== "" && !recApprover.includes(approverSearch)) {
          continue; 
        }

        // ==========================================
        // 🚀 BUG FIX: Count ALL KPIs using your original logic
        // ==========================================
        if (statUp === "OUT") outCount++;
        if (statUp === "COMPLETED" || statUp === "LATE") returnsCount++;
        if (statUp === "COMPLETED") ontimeCount++;
        if (statUp === "LATE") lateCount++;

        // Assign Badge Colors
        let badgeClass = "badge bg-warning text-dark"; 
        if(statUp === "APPROVED") badgeClass = "badge bg-success";
        if(statUp === "REJECTED") badgeClass = "badge bg-danger";
        if(statUp === "OUT") badgeClass = "badge bg-info text-dark";
        if(statUp === "COMPLETED") badgeClass = "badge bg-primary";
        if(statUp === "LATE") badgeClass = "badge bg-danger text-white";
        if(statUp === "EXPIRED") badgeClass = "badge bg-secondary text-white";
        // New Dynamic Live-Tracking Badges
        if(statUp === "FIELD-IN") badgeClass = "badge bg-success text-white";
        if(statUp === "FIELD-OUT") badgeClass = "badge bg-danger text-white";

        // Assign Action Buttons or "Actioned By" text
        let actionBtns = "";
        
        let tripButton = "";
        if (statUp === "FIELD-IN" || statUp === "FIELD-OUT") {
             // 🚀 JSON मधील डबल कोट्स (`"`) मुळे HTML मोडून पडू नये म्हणून encodeURIComponent वापरणे
             let safeJSON = encodeURIComponent(rec.tripLogs || "[]");
             tripButton = `<button class="btn btn-sm btn-outline-primary shadow-sm mt-1" onclick="viewTrips('${safeJSON}')">View Trips</button>`;
        }

        if (statUp === "PENDING") {
          actionBtns = `
            <button class="btn btn-sm btn-success me-1 shadow-sm mb-1" onclick="approvePass('${rec.passId}')">Approve</button>
            <button class="btn btn-sm btn-danger shadow-sm mb-1" onclick="rejectPass('${rec.passId}')">Reject</button>
          `;
        } else {
          actionBtns = `
            <span class="small text-muted fw-bold d-block">Actioned</span>
            <small class="text-primary" style="font-size: 0.65rem;">By: ${rec.approver}</small>
            <div class="mt-1">${tripButton}</div>
          `;
        }

        // Draw Row
        // Add this inside the loop in loadAdminDashboard
tbody.innerHTML += `
  <tr data-date="${new Date(rec.date).toISOString().split('T')[0]}">
    <td><span class="fw-bold text-primary">${rec.passId}</span></td>
    <td class="small text-muted">${new Date(rec.date).toLocaleDateString()}</td>
    <td>
      <div class="fw-bold text-dark">${rec.name}</div>
      <div class="small text-muted">${rec.empId}</div>
    </td>
    <td>${rec.dept}</td>
    <td>
      <div class="text-dark">${rec.reason}</div>
      <div class="small text-muted"><i class="bi bi-clock"></i> ${rec.time}</div>
    </td>
    <td><span class="${badgeClass} px-3 py-2 rounded-pill">${rec.status}</span></td>
    <td class="text-center align-middle">${actionBtns}</td>
  </tr>
`;
      }
      
      if (tbody.innerHTML === "") {
        tbody.innerHTML = "<tr><td colspan='6' class='text-center py-4 text-muted'>No matching records found.</td></tr>";
      }
    }

    // ==========================================
    // 🚀 UI FIX: Push the new KPI counts to the Dashboard cards
    // ==========================================
    if(document.getElementById('adm_out')) document.getElementById('adm_out').innerText = outCount;
    if(document.getElementById('adm_in')) document.getElementById('adm_in').innerText = returnsCount;
    if(document.getElementById('adm_ontime')) document.getElementById('adm_ontime').innerText = ontimeCount;
    if(document.getElementById('adm_late')) document.getElementById('adm_late').innerText = lateCount;

    if(loader) loader.classList.add('d-none');
    if(tableContainer) tableContainer.classList.remove('d-none');

    // Re-apply filter bar search text if any exists
    if(typeof adminMultiFilter === 'function') adminMultiFilter(); 

  }).getAllGatepasses(timeFrame); // 🕒 NEW: Passing the timeframe to your backend!
}


// =========================================================
// 🏢 VISITOR / EMPLOYEE / SECURITY QUEUE MANAGEMENT & ROUTING
// =========================================================

function refreshCurrentDashboard() {
  const tbody = document.getElementById('adminTableBody');
  // 🚀 INSTANT CLEAR: रिफ्रेश दाबल्याक्षणी जुना डेटा उडवा आणि लोडिंग दाखवा
  if(tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted fw-bold">Refreshing Data...</p></td></tr>`;

  if (document.getElementById('btnToggleSec') && document.getElementById('btnToggleSec').checked) {
    loadGuardDashboard();
  } else if (document.getElementById('btnToggleVis') && document.getElementById('btnToggleVis').checked) {
    loadVisitorDashboard();
  } else {
    loadAdminDashboard();
  }
}

function switchDashboardMode(mode) {
  const empFilters = document.querySelector('.bg-white.p-3.rounded-4.mb-4.border');
  const visFilters = document.getElementById('visitorFilterBar');
  const kpiCards   = document.querySelector('.row.g-3.mb-4');
  const thead      = document.querySelector('#adminTableContainer thead tr');
  const tbody      = document.getElementById('adminTableBody');

  // 🚀 INSTANT CLEAR: टॅब बदलल्याक्षणी जुना डेटा गायब करा म्हणजे मिक्स-अप होणार नाही!
  if(tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted fw-bold">Loading secure data...</p></td></tr>`;
  }

  if (mode === 'emp') {
    if (empFilters) empFilters.style.display = 'block';
    if (visFilters) visFilters.classList.add('d-none');
    if (kpiCards)   kpiCards.style.display = 'flex';
    
    // Employee Headers
    if (thead) thead.innerHTML = `<th class="ps-3 border-0">ID</th><th class="border-0">DATE</th><th class="border-0">NAME</th><th class="border-0">DEPT</th><th class="border-0">REASON & TIME</th><th class="border-0">STATUS</th><th class="text-center border-0">ACTIONS / APPROVER</th>`;
    
    loadAdminDashboard();

  } else if (mode === 'vis') {
    if (empFilters) empFilters.style.display = 'none';
    if (visFilters) visFilters.classList.remove('d-none');
    if (kpiCards)   kpiCards.style.display = 'none';
    
    // Visitor Headers
    if (thead) thead.innerHTML = `<th class="ps-3 border-0">VISITOR ID</th><th class="border-0">VISITOR & COMPANY</th><th class="border-0">HOST NAME</th><th class="border-0">REASON & TIME</th><th class="border-0">STATUS</th><th class="text-center border-0">ACTIONS</th>`;
    
    loadVisitorDashboard();

  } else if (mode === 'sec') {
    if (empFilters) empFilters.style.display = 'none';
    if (visFilters) visFilters.classList.add('d-none');
    if (kpiCards)   kpiCards.style.display = 'none';
    
    // Security Guard Headers
    if (thead) thead.innerHTML = `<th class="ps-3 border-0" style="width: 20%;">TOUR HOUR</th><th class="border-0" style="width: 35%;">✅ COMPLETED SCANS</th><th class="border-0" style="width: 30%;">❌ MISSED CHECKPOINTS</th><th class="border-0 text-center" style="width: 15%;">TOUR STATUS</th>`;
    
    loadGuardDashboard();
  }
}

function loadVisitorDashboard() {
  const loader = document.getElementById('adminLoader');
  const tableContainer = document.getElementById('adminTableContainer');
  const timeFrame = document.getElementById('globalTimeFilter') ? document.getElementById('globalTimeFilter').value : 'today';

  // Only show the big loader if we don't have a table loaded yet (prevents flickering)
  const currentTable = document.getElementById('adminTableBody');
  if (!currentTable || currentTable.innerHTML === "") {
      if(loader) loader.classList.remove('d-none');
      if(tableContainer) tableContainer.classList.add('d-none');
  }

  google.script.run.withSuccessHandler(function(response) {
    const tbody = document.getElementById('adminTableBody');
    if(!tbody) return;
    tbody.innerHTML = "";

    // Dynamically change the Table Headers for Visitors
    const thead = document.querySelector('#adminTableContainer thead tr');
    if(thead) {
      thead.innerHTML = `
        <th class="ps-3 border-0">VISITOR ID</th>
        <th class="border-0">VISITOR & COMPANY</th>
        <th class="border-0">HOST NAME</th>
        <th class="border-0">REASON & TIME</th>
        <th class="border-0">STATUS</th>
        <th class="text-center border-0">ACTIONS</th>`;
    }

    if (!response || response.status === "empty" || !response.data || response.data.length === 0) {
      tbody.innerHTML = "<tr><td colspan='6' class='text-center py-4 text-muted'>No visitors found for this timeframe.</td></tr>";
    } else {
      for(let i = 0; i < response.data.length; i++) {
        let v = response.data[i];
        let statUp = (v.status || "").toUpperCase();
        
        let badgeClass = statUp === "APPROVED" ? "bg-success" : statUp === "REJECTED" ? "bg-danger" : "bg-warning text-dark";

        let actionBtns = statUp === "PENDING" ? 
          `<button class="btn btn-sm btn-success fw-bold px-3 me-1 shadow-sm" onclick="adminVisitorAction('${v.passId}', 'APPROVED', this)">Approve</button>
           <button class="btn btn-sm btn-danger fw-bold px-3 shadow-sm" onclick="adminVisitorAction('${v.passId}', 'REJECTED', this)">Reject</button>` : 
          `<span class="small text-muted fw-bold d-block">Actioned</span>`;

        tbody.innerHTML += `
          <tr class="visitor-row">
            <td><span class="fw-bold text-primary">${v.passId}</span></td>
            <td><div class="fw-bold text-dark v-name">${v.name}</div><div class="small text-muted">${v.company}</div></td>
            <td class="fw-bold text-secondary v-host">${v.host}</td>
            <td><div class="text-dark">${v.reason}</div><div class="small text-muted"><i class="bi bi-clock"></i> ${v.time}</div></td>
            <td class="v-status"><span class="badge ${badgeClass} px-3 py-2 rounded-pill">${v.status}</span></td>
            <td class="text-center align-middle">${actionBtns}</td>
          </tr>`;
      }
    }
    
    if(loader) loader.classList.add('d-none');
    if(tableContainer) tableContainer.classList.remove('d-none');
    
    // Apply local visitor filters
    if(typeof visitorMultiFilter === 'function') visitorMultiFilter(); 
    
  }).getAllVisitors(timeFrame);
}

function visitorMultiFilter() {
  const f_host = document.getElementById('v_f_host') ? document.getElementById('v_f_host').value.toUpperCase().trim() : "";
  const f_vis = document.getElementById('v_f_visitor') ? document.getElementById('v_f_visitor').value.toUpperCase().trim() : "";
  const f_status = document.getElementById('v_f_status') ? document.getElementById('v_f_status').value.toUpperCase().trim() : "";

  const rows = document.querySelectorAll('.visitor-row');
  
  rows.forEach(row => {
    const hostText = row.querySelector('.v-host').innerText.toUpperCase();
    const visText = row.querySelector('.v-name').innerText.toUpperCase();
    const statusText = row.querySelector('.v-status').innerText.toUpperCase();

    const matchHost = hostText.includes(f_host);
    const matchVis = visText.includes(f_vis);
    const matchStatus = f_status === "" || statusText.includes(f_status);

    row.style.display = (matchHost && matchVis && matchStatus) ? "" : "none";
  });
}

function adminVisitorAction(passId, status, btnElement) {
  btnElement.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  btnElement.disabled = true;
  
  const adminName = localStorage.getItem('empName') || "Master Admin";
  
  google.script.run
    .withSuccessHandler(function(res) {
      if(res.status === "Success") {
        loadVisitorDashboard(); // Reload the visitor table
      } else {
        alert("Action failed: " + res.message);
        loadVisitorDashboard(); 
      }
    })
    .withFailureHandler(err => alert("Update failed: " + err))
    .updateVisitorStatusFromAdmin(passId, status, adminName); 
}

// --- 8. UI ROUTING & DATA FETCHING ---

// --- 8. UI ROUTING & DATA FETCHING ---

function switchView(view) {
  // NUCLEAR HIDE: Forcefully shut down every single view and strip flexbox styles
  ['loginView', 'regView', 'empDashView', 'adminDashView', 'mainAppContainer'].forEach(id => {
    let el = document.getElementById(id);
    if(el) {
      el.classList.add('hidden-view');
      el.style.setProperty('display', 'none', 'important');
    }
  });

  if (view === 'emp') {
    let main = document.getElementById('mainAppContainer');
    let emp = document.getElementById('empDashView');
    if(main) { main.classList.remove('hidden-view'); main.style.display = 'block'; }
    if(emp) { emp.classList.remove('hidden-view'); emp.style.display = 'block'; }
  } 
  else if (view === 'admin') {
    let admin = document.getElementById('adminDashView');
    if(admin) { admin.classList.remove('hidden-view'); admin.style.display = 'block'; }
  } 
  else if (view === 'reg') {
    let main = document.getElementById('mainAppContainer');
    let reg = document.getElementById('regView');
    if(main) { main.classList.remove('hidden-view'); main.style.display = 'block'; }
    if(reg) { 
      reg.classList.remove('hidden-view'); 
      reg.classList.add('split-layout'); // Restore split layout
      reg.style.display = 'flex'; 
    }
    google.script.run.withSuccessHandler(id => {
        if(document.getElementById('r_id')) document.getElementById('r_id').value = id;
    }).getNextID();
  } 
  else if (view === 'log') {
    let main = document.getElementById('mainAppContainer');
    let log = document.getElementById('loginView');
    if(main) { main.classList.remove('hidden-view'); main.style.display = 'block'; }
    if(log) { 
      log.classList.remove('hidden-view'); 
      log.classList.add('split-layout'); // Restore split layout
      log.style.display = 'flex'; 
    }
  }
}


function switchEmpTab(tab) {
  const homeTab = document.getElementById('tab-home');
  const historyTab = document.getElementById('tab-history');

  // Reset colors for bottom nav icons
  document.querySelectorAll('.fixed-bottom button').forEach(btn => btn.classList.replace('text-primary', 'text-muted'));

  if (tab === 'home') {
    // 1. Show Home, Hide History (BULLETPROOF)
    document.getElementById('nav-home').classList.replace('text-muted', 'text-primary');
    
    if(homeTab) {
      homeTab.classList.remove('d-none');
      homeTab.style.display = 'block'; // Forces it to show
    }
    if(historyTab) {
      historyTab.classList.add('d-none');
      historyTab.style.display = 'none'; // Forces it to hide
    }
  } else {
    // 2. Hide Home, Show History (BULLETPROOF)
    document.getElementById('nav-history').classList.replace('text-muted', 'text-primary');
    
    if(homeTab) {
      homeTab.classList.add('d-none');
      homeTab.style.display = 'none'; 
    }
    if(historyTab) {
      historyTab.classList.remove('d-none');
      historyTab.style.display = 'block'; // Forces it to show!
    }

    // 3. Trigger the data load
    loadEmployeeHistory();
  }
}

function showSection(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('d-none');
    el.style.display = 'block';
  }
}

function renderDigitalID(pass) {
  if (document.getElementById('passCardName')) document.getElementById('passCardName').innerText = pass.name;
  if (document.getElementById('passCardId')) document.getElementById('passCardId').innerText = pass.passId;
  if (document.getElementById('passCardApprover')) document.getElementById('passCardApprover').innerText = pass.approvedBy;
  if (document.getElementById('passCardAuthTime')) document.getElementById('passCardAuthTime').innerText = pass.requestTime;
  if (document.getElementById('passCardOutTime')) document.getElementById('passCardOutTime').innerText = pass.outTime;
  
  const photoImg = document.getElementById('passCardPhoto');
  if (photoImg) {
    photoImg.src = pass.photo || "";
  }
}

function loadEmployeeHistory() {
  const container = document.getElementById('empHistoryList');
  if(!container) return; 
  
  container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary spinner-border-sm"></div><p class="small text-muted mt-2">Loading History...</p></div>';

  const empId = sessionStorage.getItem('emp_id') || localStorage.getItem('emp_id');

  if (!empId) {
     container.innerHTML = '<div class="text-center py-5 text-danger"><p>Error: Employee ID not found. Please logout and login again.</p></div>';
     return;
  }

  google.script.run
    .withSuccessHandler(function(response) {
      container.innerHTML = ""; 

      // CRITICAL FIX: Unwrap the 'data' package from the backend safely!
      const historyData = (response && response.data) ? response.data : response;

      if (!historyData || historyData.length === 0) {
        container.innerHTML = `
          <div class="text-center py-5 text-muted">
            <i class="bi bi-calendar-x fs-1 opacity-25 d-block mb-2"></i>
            <p>No history found.</p>
          </div>`;
        return;
      }

      // Loop through the unwrapped data
      historyData.forEach(function(row) {
        let statusBadge = "bg-warning text-dark"; 
        if(row.status === "APPROVED") statusBadge = "bg-success";
        if(row.status === "REJECTED") statusBadge = "bg-danger";
        if(row.status === "OUT") statusBadge = "bg-info text-dark";
        if(row.status === "COMPLETED") statusBadge = "bg-primary";
        if(row.status === "LATE") statusBadge = "bg-danger text-white";
        if(row.status === "EXPIRED") statusBadge = "bg-secondary text-white";

     container.innerHTML += `
          <div class="card border-0 shadow-sm mb-3" style="border-radius: 12px;">
            <div class="card-body p-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge ${statusBadge} rounded-pill px-3" style="font-size: 0.65rem;">${row.status}</span>
                <small class="text-muted fw-bold">${row.passId}</small>
              </div>
              <h6 class="fw-bold text-dark mb-1">${row.reason}</h6>
              
             <div class="d-flex justify-content-between small text-muted">
                <span><i class="bi bi-calendar3 me-1"></i> ${row.date}</span>
                <span style="font-size: 0.75rem;">
                  <b class="text-danger">Out:</b> ${row.time} &nbsp;|&nbsp; 
                  <b class="text-success">In:</b> ${row.inTime || '--:--'}
                </span>
              </div>
              </div>
          </div>
        `;
      });
    })
    .withFailureHandler(function(error) {
       container.innerHTML = `<div class="text-center py-5 text-danger"><p>Server Error: ${error.message}</p></div>`;
    })
    .getEmployeeHistory(empId); 
}

/** THE MASTER CONTROLLER (Fast & Smooth Dashboard Loader) */
function showEmployeePage() {
  // 1. THE BOUNCER: Check for ID on this specific device/browser
  const empId = localStorage.getItem('emp_id') || sessionStorage.getItem('emp_id');
  
  if (!empId) { 
    console.warn("No active session found. Redirecting to Login.");
    switchView('log'); 
    return;
  }
  
  // Show the Employee View shell
  switchView('emp');

  // 2. ACTIVATE SPLASH LOADER
  const loader = document.getElementById('appLoader');
  if (loader) { 
    loader.style.display = 'flex'; 
    loader.style.opacity = '1'; 
  }

  // 3. THE SERVER CALL (Master Fetch)
  google.script.run.withSuccessHandler(function(data) {
    
    // SAFETY CHECK: Prevent the ".name" crash if data or profile is null
    if (!data || !data.profile) {
      console.error("Critical Error: User profile data is null or missing.");
      alert("Session Error: Profile not found. Please Login again.");
      localStorage.clear();
      sessionStorage.clear();
      switchView('log');
      return;
    }

    // 4. FILL PROFILE DATA SAFELY
    if(document.getElementById('userName')) document.getElementById('userName').innerText = data.profile.name || "User";
    if(document.getElementById('userDept')) document.getElementById('userDept').innerText = data.profile.dept || "N/A";
    if(data.profile.photo && document.getElementById('userPhoto')) {
       document.getElementById('userPhoto').src = data.profile.photo;
    }

    // 5. FILL STATS
    if(document.getElementById('stat_total')) document.getElementById('stat_total').innerText = data.stats.total || 0;
    if(document.getElementById('stat_fail')) document.getElementById('stat_fail').innerText = data.stats.reject || 0;

    // 6. TRIPLE-LOCK HIDE DYNAMIC CARDS (Reset UI State)
    ['raiseTicketSection', 'pendingSection', 'punchOutSection', 'activePassView', 'fwContainer'].forEach(id => {
      let el = document.getElementById(id);
      if(el) { 
        el.style.setProperty('display', 'none', 'important'); 
        el.classList.add('d-none'); 
      }
    });

    // 7. REVEAL THE CORRECT VIEW CARD BASED ON STATUS
    if (!data.activePass) {
      // No active pass? Show the "Raise Ticket" form
      let raiseSec = document.getElementById('raiseTicketSection');
      if(raiseSec) {
          raiseSec.style.display = 'block';
          raiseSec.classList.remove('d-none');
      }
    } else {
      const pass = data.activePass;
      currentPassId = pass.passId;
      
      if (pass.status === "PENDING") {
        let pendSec = document.getElementById('pendingSection');
        if(pendSec) {
            pendSec.style.display = 'block';
            pendSec.classList.remove('d-none');
        }
        if(typeof startStatusChecker === 'function') startStatusChecker();

      } else if (pass.status === "APPROVED") {
        let punchSec = document.getElementById('punchOutSection');
        if(punchSec) {
            punchSec.style.display = 'block';
            punchSec.classList.remove('d-none');
        }
        localStorage.setItem('activePassId', pass.passId);

      } else if (pass.status === "OUT") {
        let activeView = document.getElementById('activePassView');
        if(activeView) {
            activeView.style.display = 'block';
            activeView.classList.remove('d-none');
        }
        // Trigger Geofencing and Timers
        pass.outTimeFull = pass.outTimeRaw; 
        if(typeof handleOutState === 'function') handleOutState(pass); 
        
      } else if (pass.status === "FIELD-IN" || pass.status === "FIELD-OUT") {
        // This is the trigger that shows the Log Exit / Log Return buttons
        renderFieldWorkDashboard(pass.passId, pass.status, pass.tripLogs);
      }
    }

    // 8. DEACTIVATE SPLASH LOADER (Smooth Fade)
    if (loader) {
      loader.style.transition = "opacity 0.5s ease";
      loader.style.opacity = "0";
      setTimeout(() => { loader.style.display = "none"; }, 500);
    }

  }).withFailureHandler(function(err) {
    console.error("Server Fetch Failed:", err);
    if (loader) loader.style.display = 'none';
    alert("Connection Error. Please check your internet and refresh.");
  }).getInitialDashboardData(empId);
}

function getDistance(lat1, lon1, lat2, lon2) {
  var p = 0.017453292519943295;
  var c = Math.cos;
  var a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a));
}

/**
 * UNIVERSAL ADMIN FILTER (Instant Search)
 * This filters the Gatepass Table in real-time as the Admin types.
 */
function adminMultiFilter() {
  const f_id       = document.getElementById('f_id') ? document.getElementById('f_id').value.toUpperCase().trim() : "";
  const f_dateElement = document.getElementById('f_date');
  const f_date       = f_dateElement ? f_dateElement.value : ""; 
  const f_name       = document.getElementById('f_name') ? document.getElementById('f_name').value.toUpperCase().trim() : "";
  const f_dept       = document.getElementById('f_dept') ? document.getElementById('f_dept').value.toUpperCase().trim() : "";
  const f_reason     = document.getElementById('f_reason_cat') ? document.getElementById('f_reason_cat').value.toUpperCase().trim() : "";
  const f_status     = document.getElementById('f_status') ? document.getElementById('f_status').value.toUpperCase().trim() : "";
  const f_approver   = document.getElementById('filterApprover') ? document.getElementById('filterApprover').value.toUpperCase().trim() : "";

  const rows = document.querySelectorAll('#adminTableBody tr');
  let visibleCount = 0;
  
  // NEW: Track KPI counts based ONLY on the filtered rows
  let outCount = 0, returnsCount = 0, ontimeCount = 0, lateCount = 0;

  rows.forEach(row => {
    if (row.id === "no-results-row") return;

    const rowDate      = row.getAttribute('data-date') || ""; 
    const idText       = row.cells[0].innerText.toUpperCase().trim(); 
    const nameText     = row.cells[2] ? row.cells[2].innerText.toUpperCase().trim() : ""; 
    const deptText     = row.cells[3] ? row.cells[3].innerText.toUpperCase().trim() : ""; 
    const reasonText   = row.cells[4] ? row.cells[4].innerText.toUpperCase().trim() : ""; 
    const statusText   = row.cells[5] ? row.cells[5].innerText.toUpperCase().trim() : ""; 
    const approverText = row.cells[6] ? row.cells[6].innerText.toUpperCase().trim() : ""; 

    const matchesId      = idText.includes(f_id);
    const matchesDate    = f_date === "" || rowDate === f_date; 
    const matchesName    = nameText.includes(f_name);
    const matchesDept    = f_dept === "" || deptText === f_dept; 
    const matchesReason  = f_reason === "" || reasonText.includes(f_reason);
    
    let matchesStatus = false;
    if (f_status === "") {
        matchesStatus = true;
    } else if (f_status === "FIELD") {
        matchesStatus = statusText.includes("FIELD"); 
    } else {
        matchesStatus = statusText === f_status;
    }
    
    const matchesApprover = f_approver === "" || approverText.includes(f_approver);

    if (matchesId && matchesDate && matchesName && matchesDept && matchesReason && matchesStatus && matchesApprover) {
      row.style.display = ""; 
      visibleCount++; 
      
      // Calculate dynamic KPIs for visible records
      if (statusText === "OUT") outCount++;
      if (statusText === "COMPLETED" || statusText === "LATE") returnsCount++;
      if (statusText === "COMPLETED") ontimeCount++;
      if (statusText === "LATE") lateCount++;
      
    } else {
      row.style.display = "none"; 
    }
  });

  // Push the dynamic counts directly to the Dashboard UI
  if(document.getElementById('adm_out')) document.getElementById('adm_out').innerText = outCount;
  if(document.getElementById('adm_in')) document.getElementById('adm_in').innerText = returnsCount;
  if(document.getElementById('adm_ontime')) document.getElementById('adm_ontime').innerText = ontimeCount;
  if(document.getElementById('adm_late')) document.getElementById('adm_late').innerText = lateCount;

  if (typeof showNoResultsMessage === 'function') {
    showNoResultsMessage(visibleCount);
  }
}

// --- PREMIUM STATUS PILL LOGIC ---
function setStatusFilter(clickedBtn, statusValue) {
  // 1. Remove the "active" highlight from all pills
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 2. Add the "active" highlight to the one they just clicked
  clickedBtn.classList.add('active');
  
  // 3. Set the hidden input value so the main filter knows what to do
  document.getElementById('f_status').value = statusValue;
  
  // 4. Trigger the instant table refresh
  adminMultiFilter();
}

/**
 * Displays a professional message if no records match the filter
 */
function showNoResultsMessage(count) {
  const tbody = document.getElementById('adminTableBody');
  const existingMsg = document.getElementById('no-results-row');

  // Remove the old message if it exists
  if (existingMsg) existingMsg.remove();

  if (count === 0) {
    // Create a modern, clean "No Results" row
    const noResultsHTML = `
      <tr id="no-results-row">
        <td colspan="6" class="text-center py-5">
          <div class="text-muted">
            <i class="bi bi-search fs-1 mb-3 d-block opacity-25"></i>
            <h5 class="fw-bold">No Records Found</h5>
            <p class="small mb-0">Try adjusting your filters or search terms.</p>
            <button class="btn btn-link btn-sm text-primary mt-2 fw-bold" onclick="clearFilters()">Clear All Filters</button>
          </div>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', noResultsHTML);
  }
}

/** * EXPORT TO CSV: Downloads exactly what is currently visible on the Admin Dashboard
 */
function downloadReport() {
  const btn = event.target.closest('button') || event.target;
  const originalText = btn.innerHTML;
  
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Generating...';
  btn.disabled = true;

  // We use a tiny timeout so the button has time to show "Generating..." before the browser freezes to build the CSV
  setTimeout(() => {
    try {
      const isEmployeeTab = document.getElementById('btnToggleEmp').checked;
      const rows = document.querySelectorAll('#adminTableBody tr');
      
      let csvContent = "";
      
      // 🚀 NEW: Added the "Trip Details" column to the header!
      if (isEmployeeTab) {
         csvContent = "Pass ID,Date,Name,Employee ID,Department,Reason,Time,Status,Approver,Trip Details\n";
      } else {
         csvContent = "Visitor ID,Visitor Name,Company,Host Name,Reason,Time,Status\n";
      }
      
      let visibleCount = 0;

      rows.forEach(row => {
        // Skip hidden rows or "No results" messages
        if (row.id === "no-results-row" || row.style.display === "none") return;

        let rowData = [];
        
        if (isEmployeeTab) {
            let passId = row.cells[0].innerText.trim();
            let date = row.cells[1].innerText.trim();
            
            let nameParts = row.cells[2].innerText.split('\n');
            let name = nameParts[0] ? nameParts[0].trim() : "";
            let empId = nameParts[1] ? nameParts[1].trim() : "";
            
            let dept = row.cells[3].innerText.trim();
            
            let reasonParts = row.cells[4].innerText.split('\n');
            let reason = reasonParts[0] ? reasonParts[0].trim() : "";
            let time = reasonParts[1] ? reasonParts[1].trim() : "";
            
            let status = row.cells[5].innerText.trim();
            
            // Clean up Approver Name so it doesn't accidentally pull the button text
            let approverText = row.cells[6].innerText;
            let approver = "System";
            if (approverText.includes("By:")) {
                approver = approverText.split("By:")[1].split('\n')[0].trim();
            }

            // ==========================================
            // 🚀 NEW: EXTRACT THE HIDDEN TRIP LOGS & TOTALS
            // ==========================================
            let tripDetails = "N/A";
            
            // Look for the "View Trips" button in this specific row
            let tripBtn = row.cells[6].querySelector('button[onclick^="viewTrips"]');
            
            if (tripBtn) {
                try {
                    // Extract the raw encoded JSON from inside the onclick attribute
                    let encodedJson = tripBtn.getAttribute('onclick').match(/'([^']+)'/)[1];
                    let jsonStr = decodeURIComponent(encodedJson);
                    let trips = JSON.parse(jsonStr);
                    
                    if (trips && trips.length > 0) {
                        let totalMillis = 0;
                        let nowTime = new Date().getTime();

                        // Loop through all trips and format them into readable text
                        let tripStrings = trips.map((t, idx) => {
                           let outT = t.out ? new Date(t.out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "--:--";
                           let inT = t.in ? new Date(t.in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Active (Out)";
                           let rsn = t.reason || "Field Work";
                           
                           // Accumulate total time
                           if (t.out) {
                               let endTime = t.in ? t.in : nowTime; 
                               totalMillis += (endTime - t.out);
                           }

                           return `[Trip ${idx+1}: ${rsn} | Out: ${outT} | In: ${inT}]`;
                        });

                        // Do the math for Totals (Hours & Minutes)
                        let totalMins = Math.floor(totalMillis / (1000 * 60));
                        let hrs = Math.floor(totalMins / 60);
                        let mins = totalMins % 60;
                        
                        let totalTimeStr = `${hrs}h ${mins}m`;
                        let totalTripsStr = trips.length;

                        // Combine the Totals and the Trip Details together
                        tripDetails = `(TOTAL: ${totalTripsStr} Trips | TIME: ${totalTimeStr})  ====  ` + tripStrings.join("  ->  ");
                    } else {
                        tripDetails = "No trips logged";
                    }
                } catch(e) {
                    tripDetails = "Error reading trips";
                }
            }
            // ==========================================

            // Pack the row data including our new tripDetails variable
            rowData = [
              `"${passId}"`, `"${date}"`, `"${name}"`, `"${empId}"`,
              `"${dept}"`, `"${reason}"`, `"${time}"`, `"${status}"`, `"${approver}"`, `"${tripDetails}"`
            ];
            
        } else {
            let passId = row.cells[0].innerText.trim();
            
            let visParts = row.cells[1].innerText.split('\n');
            let visName = visParts[0] ? visParts[0].trim() : "";
            let company = visParts[1] ? visParts[1].trim() : "";
            
            let host = row.cells[2].innerText.trim();
            
            let reasonParts = row.cells[3].innerText.split('\n');
            let reason = reasonParts[0] ? reasonParts[0].trim() : "";
            let time = reasonParts[1] ? reasonParts[1].trim() : "";
            
            let status = row.cells[4].innerText.trim();
            
            rowData = [
              `"${passId}"`, `"${visName}"`, `"${company}"`, `"${host}"`,
              `"${reason}"`, `"${time}"`, `"${status}"`
            ];
        }

        csvContent += rowData.join(",") + "\n";
        visibleCount++;
      });

      if (visibleCount === 0) {
        alert("No visible data to export. Please adjust your search filters.");
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
      }

      // Generate the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toLocaleDateString().replace(/\//g, '-');
      
      const filePrefix = isEmployeeTab ? "NPSE_Employees_" : "NPSE_Visitors_";
      link.setAttribute("href", url);
      link.setAttribute("download", filePrefix + timestamp + ".csv");
      
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      btn.innerHTML = originalText;
      btn.disabled = false;
      
    } catch(err) {
      alert("Export Error: " + err.message);
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }, 100); 
}


let lockoutInterval;

function handleOutState(passData) {
    if (document.getElementById('displayPassId')) document.getElementById('displayPassId').innerText = passData.passId;
    if (document.getElementById('displayName')) document.getElementById('displayName').innerText = passData.name;
    
    // 🚀 नावाखाली Reason आणि Dept दिसण्यासाठी (जसं तू सांगितलं)
    if (document.getElementById('displayDept')) {
        let dept = passData.dept || localStorage.getItem('empDept') || "Employee";
        let reason = passData.reason ? " | " + passData.reason : "";
        document.getElementById('displayDept').innerText = dept + reason;
    }

    if (document.getElementById('displayApprover')) document.getElementById('displayApprover').innerText = passData.approvedBy || "Admin";

    // 🚀 ACCEPTED AT चा जुना Exact Time परत आणला ("Just Now" काढला)
    if (document.getElementById('displayAcceptTime')) {
        let exactTime = passData.requestTime;
        // जर टाईम रिकामा आलाच, तर सिस्टीमचा एक्झॅक्ट टाईम जनरेट करेल 
        if (!exactTime || exactTime === "Just Now" || exactTime === "") {
            let d = new Date();
            let options = { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: true };
            exactTime = d.toLocaleString('en-GB', options).replace(',', '');
        }
        document.getElementById('displayAcceptTime').innerText = exactTime;
    }

    if (document.getElementById('displayOutTime')) document.getElementById('displayOutTime').innerText = passData.outTime || "--:--";
    
    let shiftEndRow = document.getElementById('rowShiftEnd');
    if (shiftEndRow) {
        shiftEndRow.classList.add('d-none');
        shiftEndRow.classList.remove('d-flex');
    }

    let returnPanel = document.getElementById('returnPanelUI');
    if (returnPanel) returnPanel.style.display = 'block';
    
    let backBtn = document.getElementById('backHomeBtn');
    if (backBtn) backBtn.style.display = 'none';
    
    if(typeof startReturnLockout === 'function') startReturnLockout(passData.outTimeFull || new Date().getTime()); 
    if(typeof monitorGeofence === 'function') monitorGeofence();
}


function startReturnLockout(outTime) {
    // 1. आधीचा कोणताही टायमर चालू असेल तर तो बंद करा
    if (typeof lockoutInterval !== 'undefined') {
        clearInterval(lockoutInterval);
    }

    const updateTimer = () => {
        // 2. एलिमेंट्स दर सेकंदाला शोधा (कारण UI बदलू शकतो)
        const btn = document.getElementById('btnPunchIn');
        const timerText = document.getElementById('countdownClock');
        const lockDiv = document.getElementById('lockoutTimer');

        // 🛑 SAFETY CHECK: जर युजर Field Work च्या स्क्रीनवर असेल, तर हे एलिमेंट्स नसतील. 
        // अशा वेळी क्रॅश होण्याऐवजी शांतपणे इथूनच परत जा (return).
        if (!btn || !timerText || !lockDiv) {
            return; 
        }

        const now = new Date().getTime();
        const out = new Date(outTime).getTime();
        const diff = now - out;
        const fiveMinutes = 1 * 60 * 1000; 

        if (diff < fiveMinutes) {
            // ५ मिनिटे झाली नसतील तर बटन लॉक ठेवा
            btn.disabled = true;
            btn.classList.add('btn-secondary');
            
            const remaining = Math.ceil((fiveMinutes - diff) / 1000);
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            timerText.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        } else {
            // 🔓 ५ मिनिटे पूर्ण झाल्यावर बटन UNLOCK करा
            btn.disabled = false;
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
            lockDiv.innerHTML = '<span class="text-success small fw-bold"><i class="bi bi-check-circle"></i> Return Entry Authorized</span>';
            clearInterval(lockoutInterval); // टायमर थांबवा
        }
    };

    // टायमर चालू करा
    lockoutInterval = setInterval(updateTimer, 1000);
    updateTimer();
}

function monitorGeofence() {
    if (!navigator.geolocation) return;

    const companyLat = 19.835234; // Your company Coordinates
    const companyLng = 75.247356;
    const safeDistance = 100; // Meters

    navigator.geolocation.watchPosition((pos) => {
        const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, companyLat, companyLng);
        const status = document.getElementById('geoStatus');

        if (dist > safeDistance) {
            status.innerHTML = '<span class="text-success">Confirmed: You are off-site.</span>';
            // Only allow Punch In if they have officially "Left" first
            localStorage.setItem('hasLeftSite', 'true');
        } else {
            status.innerHTML = '<span class="text-warning">Status: Within company Perimeter.</span>';
        }
    });
}

// Haversine Formula for distance
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // meters
    const phi1 = lat1 * Math.PI/180;
    const phi2 = lat2 * Math.PI/180;
    const dPhi = (lat2-lat1) * Math.PI/180;
    const dLambda = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dPhi/2) * Math.sin(dPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(dLambda/2) * Math.sin(dLambda/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ==========================================
// BACKGROUND RADAR (LIVE ADMIN POPUPS)
// ==========================================
let notifiedPasses = new Set();
let adminPollInterval = null;
let currentPopupPassId = null;

// Ask Windows for permission when the Admin logs in
function requestDesktopNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

function startAdminRadar() {
  requestDesktopNotificationPermission(); // Ask for Desktop permissions
  if (adminPollInterval) clearInterval(adminPollInterval);
  adminPollInterval = setInterval(checkForNewTickets, 10000); // Check every 10 secs
}

function checkForNewTickets() {
  google.script.run.withSuccessHandler(function(response) {
    if (!response || response.status === "empty" || !response.data) return;

    // Filter out only the passes that are "PENDING"
    let pendingPasses = response.data.filter(p => (p.status || "").toUpperCase() === "PENDING");

    if (pendingPasses.length > 0) {
      let newestPass = pendingPasses[pendingPasses.length - 1];

      let myRole = localStorage.getItem('emp_role') || "";
      let myDept = localStorage.getItem('empDept') || "";
      
      // ==========================================
      // 🚀 1. MULTI-DEPT SMART FILTER
      // ==========================================
      if (myRole === "Dept Head") {
          let ticketDept = (newestPass.dept || "").toUpperCase().trim();
          let adminDeptList = myDept.toUpperCase();
          
          if (!adminDeptList.includes(ticketDept)) {
               return; // Skip the alarm if it's not in their list of departments
          }
      }

      // ==========================================
      // 👑 2. VIP FILTER FOR DIRECTOR (Master Admin)
      // ==========================================
      if (myRole === "Master Admin") {
          let importantEmployees = ["NPSE-1001", "NPSE-1002", "NPSE-1003","NPSE-1007", "NPSE-1008", "NPSE-1012","NPSE-1018", "NPSE-1019", "NPSE-1020","NPSE-1021", "NPSE-1010","NPSE-1022", "NPSE-1025","NPSE-1039","NPSE-1045"]; 
          
          // If the person asking for the pass is NOT in the list above, stay silent!
          if (!importantEmployees.includes(newestPass.empId)) {
              return; // The alarm will not ring.
          }
      }

      // ==========================================
      // 🛑 3. THE FIX: ONLY RING ONCE AND SHOW POPUP!
      // ==========================================
      if (!notifiedPasses.has(newestPass.passId)) {
        
        // A. Show the UI Card on the screen
        currentPopupPassId = newestPass.passId;
        const uiPopup = document.getElementById('liveApprovalPopup');
        if (uiPopup) {
          document.getElementById('popupPassId').innerText = newestPass.passId;
          document.getElementById('popupName').innerText = newestPass.name;
          document.getElementById('popupDept').innerText = newestPass.dept;
          document.getElementById('popupReason').innerText = newestPass.reason;
          document.getElementById('popupOutTime').innerText = newestPass.time;
          uiPopup.style.display = 'block';
        }

        // B. Play the sound and desktop notification
        if (typeof triggerNewGatepassAlert === "function") {
            triggerNewGatepassAlert(newestPass.name);
        }

        // C. Save to memory so it NEVER loops the sound for this pass again
        notifiedPasses.add(newestPass.passId);
      }
    }
  }).getAllGatepasses();
}

function showAdminPage() {
  switchView('admin'); 
  loadAdminDashboard(); 
  
  // Start the background radar
  startAdminRadar();
  startAutoRefresh();
  
  // 🚀 INJECT THE ADMIN'S NAME INTO THE CORNER
  var adminName = localStorage.getItem('empName') || "Admin";
  if(document.getElementById('displayAdminName')) {
      document.getElementById('displayAdminName').innerText = "Hi, " + adminName;
  }

  // ==========================================
  // 👔 SMART UI: DYNAMIC ADMIN FILTERS
  // ==========================================
  var role = localStorage.getItem('emp_role');
  
  // 1. Hide the Department filter for Dept Heads
  var deptDropdown = document.getElementById('f_dept');
  if (role === "Dept Head" && deptDropdown) {
      // Hides the dropdown so Dept Heads don't get confused
      deptDropdown.style.display = "none"; 
      
      // Optional: If your dropdown is wrapped in a div/col, hide the parent too so it doesn't leave an empty space
      if(deptDropdown.parentElement) {
          deptDropdown.parentElement.style.display = "none"; 
      }
  }

  // ==========================================
  // 2. 🚀 NEW: HIDE VISITOR TOGGLE FOR REGULAR ADMINS
  // ==========================================
  var visToggleInput = document.getElementById('btnToggleVis');
  var visToggleLabel = document.querySelector('label[for="btnToggleVis"]');
  
  if (role !== "Master Admin") {
      // If NOT Master Admin, hide the Visitors button completely
      if (visToggleInput) visToggleInput.classList.add('d-none');
      if (visToggleLabel) visToggleLabel.classList.add('d-none');
  } else {
      // If Master Admin, ensure the Visitors button is visible
      if (visToggleInput) visToggleInput.classList.remove('d-none');
      if (visToggleLabel) visToggleLabel.classList.remove('d-none');
  }

  // 3. Show Master Tools only if role is Master Admin
  if(role === "Master Admin") {
    // Inside the existing: if(role === "Master Admin") { ... } block
var secToggleInput = document.getElementById('btnToggleSec');
var secToggleLabel = document.getElementById('lblToggleSec');
if (secToggleInput) secToggleInput.style.display = '';
if (secToggleLabel) secToggleLabel.style.display = '';
    var masterBtn = document.getElementById('masterMenuBtn');
    if(masterBtn) masterBtn.classList.remove('d-none');
    
    // Loads the Sub-Admins in the sidebar
    if(typeof loadSubAdminTable === 'function') {
        loadSubAdminTable();
    }
  }
}

function handlePopupAction(action) {
  const popup = document.getElementById('liveApprovalPopup');
  
  // 🚀 THE FIX: Check local storage!
  const adminName = localStorage.getItem('empName') || sessionStorage.getItem('empName') || "System Admin";
  
  if(popup) popup.style.display = 'none'; 

  google.script.run
    .withSuccessHandler(function(res) {
       if (res.status === "Success") {
         loadAdminDashboard(); 
       }
    })
    .updatePassStatus(currentPopupPassId, action, adminName);
}

// ==========================================
// PROFILE EDITING LOGIC
// ==========================================

function openEditModal() {
  // 1. Grab the current info from the screen
  const currentName = document.getElementById('userName').innerText;
  const currentDept = document.getElementById('userDept').innerText;

  // 2. Put it into the input boxes
  document.getElementById('editNameInput').value = currentName !== "Loading Profile..." ? currentName : "";
  document.getElementById('editDeptInput').value = currentDept !== "DEPT" ? currentDept : "";

  // 3. Open the Bootstrap Modal
  const editModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
  editModal.show();
}

function saveProfileChanges() {
  const newName = document.getElementById('editNameInput').value.trim();
  const newDept = document.getElementById('editDeptInput').value;
  const empId = localStorage.getItem('emp_id') || sessionStorage.getItem('emp_id');

  if (!newName) return alert("Name cannot be empty!");

  const btn = document.getElementById('saveProfileBtn');
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
  btn.disabled = true;

  google.script.run
    .withSuccessHandler(function(res) {
      btn.innerHTML = 'SAVE CHANGES';
      btn.disabled = false;
      
      if (res.status === "Success") {
        // Update the UI instantly without reloading
        document.getElementById('userName').innerText = newName;
        document.getElementById('userDept').innerText = newDept;
        
        // Update local storage so new gatepasses use the correct name
        localStorage.setItem('empName', newName);
        sessionStorage.setItem('empName', newName);

        // Close the modal
        const modalEl = document.getElementById('editProfileModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance.hide();
        
        alert("Profile updated successfully!");
      } else {
        alert("Update failed: " + res.message);
      }
    })
    .updateEmployeeInfo(empId, newName, newDept);
}

function handleProfilePhotoEdit(input) {
  if (!input.files || !input.files[0]) return;

  const empId = localStorage.getItem('emp_id') || sessionStorage.getItem('emp_id');
  const photoImg = document.getElementById('userPhoto');
  
  // Show a visual loading state on the profile picture
  photoImg.style.opacity = "0.5";
  
  const file = input.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) { 
    const img = new Image();
    img.onload = function() {
      // Compress the image before uploading (Max Width 200px)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const MAX_SIZE = 200;
      let width = img.width;
      let height = img.height;
      
      if (width > height) { 
        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
      } else { 
        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } 
      }
      
      canvas.width = width; 
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to heavily compressed Base64
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
      
      // Instantly show the new photo on screen
      photoImg.src = compressedBase64; 
      
      // Send to backend
      google.script.run
        .withSuccessHandler(function(res) {
           photoImg.style.opacity = "1"; // Remove loading state
           if(res.status !== "Success") {
             alert("Failed to save photo to database.");
           }
        })
        .updateEmployeePhoto(empId, compressedBase64);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ==================================================
// 🚗 FIELD WORK "PING-PONG" DASHBOARD
// ==================================================
function renderFieldWorkDashboard(passId, currentStatus, tripLogsJSON) {
    const isOut = currentStatus === "FIELD-OUT";
    
    let fwContainer = document.getElementById('fwContainer');
    if (!fwContainer) {
        fwContainer = document.createElement('div');
        fwContainer.id = 'fwContainer';
        const tabHome = document.getElementById('tab-home');
        if(tabHome) tabHome.appendChild(fwContainer);
    }
    
    let lastReason = "Field Work";
    let lastOutTime = "--:--";

    if (tripLogsJSON) {
        try {
            let logs = JSON.parse(tripLogsJSON);
            if (isOut && logs.length > 0) {
                let lastTrip = logs[logs.length - 1]; 
                lastReason = lastTrip.reason || "Field Work";
                if (lastTrip.out) {
                    lastOutTime = new Date(lastTrip.out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }
            }
        } catch(e) { 
            console.log("Error reading trip logs for UI", e); 
        }
    }

    // 🚀 हे फ्लॅग चेक करेल की तो आत्ताच Lunch/Break वरून आलाय का
    let justReturned = localStorage.getItem('returnedFromBreak') === 'true';

    let html = `
        <div class="modern-card mx-auto mt-2 overflow-hidden border border-warning border-opacity-50" style="max-width: 380px;">
            <div class="p-3 d-flex justify-content-between align-items-center bg-warning text-dark fw-bold" style="font-size: 0.85rem;">
                <span><i class="bi bi-car-front-fill me-2"></i> ALL-DAY FIELD PASS</span>
                <span class="badge ${isOut ? 'bg-danger' : 'bg-success'} rounded-pill px-3 shadow-sm">${isOut ? 'OUTSIDE' : 'INSIDE'}</span>
            </div>
            
            <div class="p-4 bg-white text-center">
                <span class="badge bg-light text-muted border px-4 py-2 rounded-pill fs-6 mb-4 font-monospace shadow-sm">${passId}</span>
                
                ${!isOut ? `
                    
                    ${justReturned ? `
                    <div class="alert alert-info border-info text-dark text-start mb-3" style="font-size: 0.8rem; font-weight: 600;">
                        <i class="bi bi-pause-circle-fill me-1"></i> Field Work is currently Paused.
                    </div>
                    ` : ''}

                    <div class="mb-4 text-start">
                        <label class="small fw-bold text-muted mb-2">
                            <i class="bi bi-geo-alt-fill text-danger me-1"></i> ${justReturned ? 'Destination (To Resume)' : 'Next Destination'}
                        </label>
                        <input type="text" id="fw_reason" class="form-control form-control-lg shadow-none bg-light border-light-subtle fw-bold" placeholder="${justReturned ? 'Where to resume work?' : 'Where to next?'}">
                    </div>
                    
                    <button class="btn btn-warning w-100 py-3 fw-bolder rounded-pill shadow-sm fs-5 mb-3" onclick="toggleFieldStatus('OUT', '${passId}')">
                        ${justReturned ? '<i class="bi bi-play-circle-fill me-2"></i> RESUME FIELD WORK' : '<i class="bi bi-box-arrow-right me-2"></i> LOG EXIT'}
                    </button>
                    
                    <hr class="text-muted opacity-25 my-4">
                    <label class="small fw-bold text-muted mb-2">Need a break or leaving early?</label>
                    <button class="btn btn-outline-primary w-100 py-2 fw-bold rounded-pill shadow-sm" onclick="openNewRequestForm()">
                        <i class="bi bi-cup-hot-fill me-1"></i> RAISE LUNCH / EXIT PASS
                    </button>
                ` : `
                    <div class="mb-4 text-start bg-light p-3 rounded-4 border border-light-subtle shadow-sm">
                        <span class="d-block text-muted small fw-bold text-uppercase mb-1" style="letter-spacing: 0.5px;">Current Destination</span>
                        <span class="d-block text-dark fw-bolder fs-5 mb-3">${lastReason}</span>
                        
                        <span class="d-block text-muted small fw-bold text-uppercase mb-1" style="letter-spacing: 0.5px;">Exit Time</span>
                        <span class="d-block text-danger fw-bolder fs-4"><i class="bi bi-clock-history me-1"></i> ${lastOutTime}</span>
                    </div>
                    <button class="btn btn-success w-100 py-3 fw-bolder rounded-pill shadow-sm fs-5" onclick="toggleFieldStatus('IN', '${passId}')">
                        <i class="bi bi-box-arrow-in-left me-2"></i> LOG RETURN TO OFFICE
                    </button>
                `}
            </div>
        </div>
    `;
    
    fwContainer.innerHTML = html;
    fwContainer.classList.remove('d-none');
    fwContainer.style.setProperty('display', 'block', 'important');
}

window.toggleFieldStatus = function(action, passId) {
    let tripReason = "";
    let reasonBox = document.getElementById('fw_reason');
    
    if (action === "OUT" && reasonBox) {
        tripReason = reasonBox.value.trim();
        if (!tripReason) {
            alert("Please enter your destination and reason!");
            return;
        }
        // 🚀 THE RESET: एकदा त्याने 'Resume' केलं की तो फ्लॅग कायमचा डिलीट करा
        localStorage.removeItem('returnedFromBreak');
    }
    
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';
    
    google.script.run.withSuccessHandler(function(res) {
        if (res.status === "Success") {
            showEmployeePage(); 
        } else {
            alert(res.message);
            btn.disabled = false;
            btn.innerHTML = action === "OUT" ? 'LOG EXIT <i class="bi bi-box-arrow-right ms-2"></i>' : 'LOG RETURN TO OFFICE';
        }
    }).logFieldMovement(passId, action, tripReason);
};

window.openNewRequestForm = function() {
    let fwContainer = document.getElementById('fwContainer');
    if(fwContainer) fwContainer.style.display = 'none';
    
    let raiseSec = document.getElementById('raiseTicketSection');
    if(raiseSec) {
        raiseSec.classList.remove('d-none');
        raiseSec.style.display = 'block';
    }
    
    let reasonSelect = document.getElementById('g_reason');
    if (reasonSelect) {
        for (let i = 0; i < reasonSelect.options.length; i++) {
            let opt = reasonSelect.options[i];
            if (opt.value === "Field Work (All-Day)") {
                opt.disabled = true;
                opt.text = "Field Work (Already Active)";
                opt.style.backgroundColor = "#e9ecef";
            }
        }
    }
};

window.viewTrips = function(encodedString) {
    const tbody = document.getElementById('tripModalBody');
    if (!tbody) return;
    tbody.innerHTML = "";
    
    let jsonString = decodeURIComponent(encodedString);
    let totalTrips = 0;
    let totalMillis = 0;
    let nowTime = new Date().getTime();
    
    if (!jsonString || jsonString === "[]" || jsonString === "undefined") {
        tbody.innerHTML = "<tr><td colspan='4' class='text-center py-3'>No trips logged yet.</td></tr>";
        document.getElementById('tripTotalCount').innerText = "0";
        document.getElementById('tripTotalTime').innerText = "0h 0m";
    } else {
        const logs = JSON.parse(jsonString);
        totalTrips = logs.length;
        
        logs.forEach((t, index) => {
            let outTime = t.out ? new Date(t.out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "--:--";
            let inTime = t.in ? new Date(t.in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '<span class="text-danger fw-bold">Active (Out)</span>';
            
            if (t.out) {
                let endTime = t.in ? t.in : nowTime; 
                totalMillis += (endTime - t.out);
            }

            tbody.innerHTML += `
                <tr>
                    <td class="ps-3 fw-bold text-secondary">#${index + 1}</td>
                    <td class="fw-bold text-dark">${t.reason || 'Field Work'}</td>
                    <td class="text-danger fw-bold">${outTime}</td>
                    <td class="text-success fw-bold">${inTime}</td>
                </tr>
            `;
        });
        
        let totalMins = Math.floor(totalMillis / (1000 * 60));
        let hrs = Math.floor(totalMins / 60);
        let mins = totalMins % 60;
        
        document.getElementById('tripTotalCount').innerText = totalTrips;
        document.getElementById('tripTotalTime').innerText = hrs + "h " + mins + "m";
    }
    
    var myModal = new bootstrap.Modal(document.getElementById('tripModal'));
    myModal.show();
};


function onDateFilterChange() {
  const selectedDate = document.getElementById('f_date').value;
  const globalTime = document.getElementById('globalTimeFilter');
  
  // If user picks a date, auto-switch to "All Time" to fetch historical data from the server
  if (selectedDate && globalTime.value !== 'all') {
     globalTime.value = 'all';
     refreshCurrentDashboard(); // This fetches data. Once done, adminMultiFilter will run automatically.
  } else {
     adminMultiFilter(); // If already on "all", just filter visually.
  }
}
// --- 🚀 FIX 1: Slow down the Auto-Refresh ---
let autoRefreshTimer = null;

function startAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    
    // Changed from 10000 (10 seconds) to 60000 (60 seconds) so it stops flickering!
    autoRefreshTimer = setInterval(function() {
        if (document.getElementById('adminDashView') && document.getElementById('adminDashView').style.display === 'block') {
            refreshCurrentDashboard();
        }
    }, 60000); 
}

// 📸 फोटो सुरक्षित ठेवण्यासाठी व्हॉल्ट
window.guardPhotoVault = window.guardPhotoVault || {};

// --- 🚀 FIX 2: The New "Hourly Trip" Tour Matrix ---
function loadGuardDashboard() {
  const loader         = document.getElementById('adminLoader');
  const tableContainer = document.getElementById('adminTableContainer');
  const timeFrame      = document.getElementById('globalTimeFilter')
                         ? document.getElementById('globalTimeFilter').value
                         : 'today';

  if (loader) loader.classList.remove('d-none');
  if (tableContainer) tableContainer.classList.add('d-none');

  // Change the headers for the new Hourly Trip layout
  const thead = document.querySelector('#adminTableContainer thead tr');
  if (thead) {
    thead.innerHTML = `
      <th class="ps-3 border-0" style="width: 20%;">TOUR HOUR</th>
      <th class="border-0" style="width: 35%;">✅ COMPLETED SCANS</th>
      <th class="border-0" style="width: 30%;">❌ MISSED CHECKPOINTS</th>
      <th class="border-0 text-center" style="width: 15%;">TOUR STATUS</th>
    `;
  }

  google.script.run.withSuccessHandler(function(response) {
    const tbody = document.getElementById('adminTableBody');
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!response || response.status === "empty" || !response.data || response.data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-5">
            <div class="text-muted">
              <div style="font-size:2rem;opacity:0.3;margin-bottom:8px;">🛡️</div>
              <p class="fw-bold mb-0">No guard scans found for this period.</p>
              <small>Make sure guards are using the scanner app.</small>
            </div>
          </td>
        </tr>`;
    } else {
      
      // 1. Get the master list of checkpoints
      let checkpoints = response.checkpoints || [];
      if (checkpoints.length === 0) {
          // Backup plan: use only the ones scanned today if the sheet is empty
          let cpMap = {};
          response.data.forEach(r => { cpMap[r.locationId] = r.locationName; });
          checkpoints = Object.keys(cpMap).map(k => ({id: k, name: cpMap[k]}));
      }

      // 2. Group the scans into 1-Hour buckets!
      let hourlyTours = {};
      let minHour = 23, maxHour = 0;

      response.data.forEach(r => {
         let d = new Date(r.timestampRaw || r.timestamp);
         let h = d.getHours();
         if (h < minHour) minHour = h;
         if (h > maxHour) maxHour = h;

         if (!hourlyTours[h]) hourlyTours[h] = { scans: {} };
         // 📸 फोटो पण सेव्ह करा
         hourlyTours[h].scans[r.locationId] = {
             time: d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
             photo: r.photoBase64 || ""
         };
      });

      // Always show up to the current hour of the day
      if (timeFrame === 'today') {
          let currentH = new Date().getHours();
          if (currentH > maxHour) maxHour = currentH;
      }

      // 3. Draw the timeline (Newest hour at the top)
      for (let h = maxHour; h >= minHour; h--) {
          let ampm = h >= 12 ? 'PM' : 'AM';
          let displayH1 = h % 12 || 12;
          let displayH2 = (h + 1) % 12 || 12;
          let ampm2 = (h + 1) >= 12 && (h + 1) < 24 ? 'PM' : 'AM';
          let timeLabel = `${displayH1}:00 ${ampm} - ${displayH2}:00 ${ampm2}`;

          let tour = hourlyTours[h] || { scans: {} };
          let completedHTML = "";
          let missedHTML = "";
          let missedCount = 0;

          // Check every location. If missed, paint it RED!
          checkpoints.forEach(cp => {
             if (tour.scans[cp.id]) {
                 let scan = tour.scans[cp.id];
                 let clickAction = '';
                 let icon = `<i class="bi bi-check-circle-fill me-1"></i>`;
                 
                 // 🛡️ EXACT FIX: फॉलबॅक लावलाय, ज्यामुळे undefined कधीच येणार नाही!
                 let displayTime = typeof scan === 'object' ? scan.time : scan;
                 let photoData = typeof scan === 'object' ? scan.photo : "";
                 
                 // 📸 फोटो असेल तर Vault मध्ये सेव्ह करा
                 if (photoData && photoData.length > 50) {
                     let safeVaultKey = "img_" + h + "_" + cp.id.replace(/[^a-zA-Z0-9]/g, "_");
                     window.guardPhotoVault = window.guardPhotoVault || {};
                     window.guardPhotoVault[safeVaultKey] = photoData;
                     
                     clickAction = `onclick="window.showGuardPhoto('${safeVaultKey}')" style="cursor:pointer;" title="Click to view Photo"`;
                     icon = `<i class="bi bi-camera-fill text-dark fs-6 me-1"></i>`;
                 }
                 
                 completedHTML += `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 me-1 mb-2 shadow-sm p-2" ${clickAction}>${icon}${cp.name} (${displayTime})</span>`;
             } else {
                 missedHTML += `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 me-1 mb-2 shadow-sm p-2"><i class="bi bi-x-circle-fill me-1"></i>${cp.name}</span>`;
                 missedCount++;
             }
          });

          // Overall status for the hour
          let statusBadge = missedCount === 0
              ? `<span class="badge bg-success px-3 py-2 rounded-pill shadow-sm"><i class="bi bi-shield-check me-1"></i> ALL SECURE</span>`
              : `<span class="badge bg-danger px-3 py-2 rounded-pill shadow-sm" style="animation: pulse 2s infinite;"><i class="bi bi-exclamation-triangle-fill me-1"></i> MISSED ${missedCount}</span>`;

          // If the hour is completely empty and completely red, highlight the whole row
          let rowBg = (missedCount === checkpoints.length) ? 'bg-danger bg-opacity-10' : '';

          tbody.innerHTML += `
            <tr class="${rowBg}">
              <td class="ps-3 fw-bolder text-dark">
                <i class="bi bi-clock-history text-primary me-2"></i>${timeLabel}
              </td>
              <td>${completedHTML || '<span class="text-muted small">No scans recorded</span>'}</td>
              <td>${missedHTML || '<span class="text-success small fw-bold">None</span>'}</td>
              <td class="text-center align-middle">${statusBadge}</td>
            </tr>`;
      }
    }

    if (loader) loader.classList.add('d-none');
    if (tableContainer) tableContainer.classList.remove('d-none');

  }).getGuardLogs(timeFrame);
}

// पॉप-अप ओपन करणारे फंक्शन
window.showGuardPhoto = function(vaultKey) {
    try {
        let photoData = window.guardPhotoVault[vaultKey];
        if (!photoData) {
            alert("Sorry, no photo found for this record.");
            return;
        }
        
        document.getElementById('guardPopupImage').src = photoData;
        
        let modalEl = document.getElementById('guardPhotoModal');
        let photoModal = bootstrap.Modal.getInstance(modalEl);
        if (!photoModal) {
            photoModal = new bootstrap.Modal(modalEl);
        }
        photoModal.show();
    } catch (err) {
        console.error(err);
    }
};
