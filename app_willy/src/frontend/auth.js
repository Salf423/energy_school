/**
 * @file auth.js
 * @description Lógica de interfaz de usuario para el inicio de sesión y registro.
 * Propósito: Conectar los formularios del frontend con authService.js.
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const registerModal = document.getElementById('register-modal');
    const openRegisterBtn = document.getElementById('open-register-modal');
    const closeRegisterBtn = document.getElementById('close-register-modal');
    
    /**
     * @section Control del Modal de Registro
     */
    if (openRegisterBtn && registerModal) {
        openRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            registerModal.classList.add('active');
        });
    }

    if (closeRegisterBtn && registerModal) {
        closeRegisterBtn.addEventListener('click', () => {
            registerModal.classList.remove('active');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === registerModal) {
            registerModal.classList.remove('active');
        }
    });

    /**
     * @section Manejo de Login
     */
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            // Estado de carga
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span></span>Procesando...';
            submitBtn.disabled = true;

            // Uso del servicio modularizado
            const { data, error } = await window.authService.login(email, password);

            if (error) {
                alert(`Error al iniciar sesión: ${error.message}`);
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            } else {
                // Persistencia local para la sesión
                localStorage.setItem('userLoggedIn', 'true');
                window.location.href = 'index.html';
            }
        });
    }

    /**
     * @section Manejo de Registro
     */
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('reg-name').value;
            const role = document.getElementById('reg-role').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-password-confirm').value;
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            
            if (password !== confirmPassword) {
                alert('Las contraseñas no coinciden.');
                return;
            }

            if (password.length < 6) {
                alert('La contraseña debe tener al menos 6 caracteres.');
                return;
            }
            
            // Estado de carga
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span></span>Registrando...';
            submitBtn.disabled = true;

            // Registro con metadata
            const { data, error } = await window.authService.signUp(email, password, name, role);

            if (error) {
                alert(`Error al registrarse: ${error.message}`);
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            } else {
                alert('¡Registro exitoso! Por favor, revisa tu correo para confirmar la cuenta o inicia sesión.');
                registerModal.classList.remove('active');
                registerForm.reset();
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});
