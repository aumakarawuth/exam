(() => {
  let student = null;
  const screens = ['startScreen','selectScreen','nameScreen','sharedLoginScreen','sharedPinSetupScreen','sharedPinVerifyScreen'];
  const show = id => { screens.forEach(screen => document.getElementById(screen).classList.toggle('hidden', screen !== id)); };
  const request = async (path, options = {}) => {
    const response = await fetch(path, { method: options.method || 'GET', headers: {'Content-Type':'application/json'}, body: options.body ? JSON.stringify(options.body) : undefined });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'เกิดข้อผิดพลาด');
    return body;
  };
  document.getElementById('goSelectBtn').addEventListener('click', () => { show('sharedLoginScreen'); document.getElementById('sharedStudentId').focus(); });
  document.getElementById('sharedLoginBack').addEventListener('click', () => show('startScreen'));
  document.querySelectorAll('[data-shared-back]').forEach(button => button.addEventListener('click', () => show('sharedLoginScreen')));
  document.getElementById('sharedLoginNext').addEventListener('click', async () => {
    const error = document.getElementById('sharedLoginError');
    try {
      student = await request('/api/students/' + encodeURIComponent(document.getElementById('sharedStudentId').value.trim()));
      error.style.display = 'none'; show(student.hasPin ? 'sharedPinVerifyScreen' : 'sharedPinSetupScreen');
      document.getElementById(student.hasPin ? 'sharedPinVerify' : 'sharedPin').focus();
    } catch (err) { error.textContent = err.message; error.style.display = 'block'; }
  });
  document.getElementById('sharedPinSetupNext').addEventListener('click', async () => {
    window.requestDfdFullscreen?.();
    const pin = document.getElementById('sharedPin').value.trim(); const confirmPin = document.getElementById('sharedPinConfirm').value.trim(); const error = document.getElementById('sharedPinSetupError');
    if (!/^\d{4,6}$/.test(pin) || pin !== confirmPin) { error.textContent = 'กรอก PIN ตัวเลข 4-6 หลักให้ตรงกัน'; error.style.display = 'block'; return; }
    try { const result=await request('/api/students/' + encodeURIComponent(student.studentId) + '/set-pin', {method:'POST', body:{pin}}); student=result.student; sessionStorage.setItem('examStudentToken', result.token); show('startScreen'); window.startObjectAnalysisExam(student); }
    catch (err) { error.textContent = err.message; error.style.display = 'block'; }
  });
  document.getElementById('sharedPinVerifyNext').addEventListener('click', async () => {
    window.requestDfdFullscreen?.();
    const error = document.getElementById('sharedPinVerifyError');
    try {
      const result = await request('/api/students/' + encodeURIComponent(student.studentId) + '/verify-pin', {method:'POST', body:{pin:document.getElementById('sharedPinVerify').value.trim()}});
      if (!result.ok) throw new Error(result.locked ? 'PIN ถูกล็อก กรุณาติดต่อผู้ดูแลระบบ' : `PIN ไม่ถูกต้อง (เหลือ ${result.remainingAttempts} ครั้ง)`);
      student=result.student; sessionStorage.setItem('examStudentToken', result.token); show('startScreen'); window.startObjectAnalysisExam(student);
    } catch (err) { error.textContent = err.message; error.style.display = 'block'; }
  });
})();
