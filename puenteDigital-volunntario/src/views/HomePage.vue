<template>
  <div class="home-container">
    <div class="hero-section">
      <div class="hero-content">
        <div class="brand-icon-container">
          <i class="bi bi-broadcast brand-icon"></i>
        </div>
        <h1 class="hero-title">¿Qué es <span class="highlight">PuenteDigital</span>?</h1>
        <p class="hero-subtitle">
          Una plataforma que conecta voluntarios con personas mayores para brindar
          asistencia técnica y apoyo en el uso de tecnologías digitales.
        </p>
        
        <div class="feature-cards">
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-people-fill"></i>
            </div>
            <h3>Conecta</h3>
            <p>Une personas mayores con voluntarios tecnológicos</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-laptop"></i>
            </div>
            <h3>Asiste</h3>
            <p>Brinda soporte técnico personalizado</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <i class="bi bi-hand-thumbs-up"></i>
            </div>
            <h3>Apoya</h3>
            <p>Fomenta la autonomía digital para todos</p>
          </div>
        </div>

        <div class="action-buttons">
          <router-link to="/register" class="btn primary-button">
            <i class="bi bi-person-plus"></i> Soy Nuevo
          </router-link>
          <router-link to="/login" class="btn secondary-button">
            <i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión
          </router-link>
        </div>
      </div>
    </div>


    <div class="testimonials-section">
      <h2 class="section-title">¿Cómo funciona?</h2>
      <div class="steps-container">
        <div class="step">
          <div class="step-number">1</div>
          <h3>Registro</h3>
          <p>Los voluntarios se registran en la plataforma para ofrecer su ayuda</p>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <h3>Conexión</h3>
          <p>Las personas mayores solicitan asistencia a través de la aplicación</p>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <h3>Asistencia</h3>
          <p>Los voluntarios brindan apoyo personalizado mediante chat o videollamada</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Home',
};
</script>

<style scoped>
/* Estilos generales */
.home-container {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  color: #333;
}

/* Hero Section */
.hero-section {
  min-height: 80vh;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  position: relative;
  color: #266cee;
}

.hero-content {
  max-width: 1100px;
  margin: 0 auto;
  text-align: center;
  padding: 20px;
  position: relative;
  z-index: 1;
}

.brand-icon-container {
  width: 80px;
  height: 80px;
  background: #266cee;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 30px;
  box-shadow: 0 5px 15px rgba(38, 108, 238, 0.2);
}

.brand-icon {
  font-size: 40px;
  color: white;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: #333;
}

.highlight {
  color: #266cee;
  text-decoration: underline;
  text-decoration-color: #266cee;
  text-decoration-thickness: 2px;
  text-underline-offset: 8px;
  font-weight: 800;
}

.hero-subtitle {
  font-size: 1.5rem;
  max-width: 700px;
  margin: 0 auto 50px;
  line-height: 1.5;
  color: #555;
}

/* Tarjetas de características */
.feature-cards {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 50px;
  flex-wrap: wrap;
}

.feature-card {
  background: white;
  border-radius: 15px;
  padding: 30px;
  width: 300px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid #e6e6e6;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.feature-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 10px 30px rgba(38, 108, 238, 0.15);
  border-color: #266cee;
}

.feature-icon {
  font-size: 40px;
  margin-bottom: 15px;
  color: #266cee;
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 15px;
  font-weight: 600;
  color: #266cee;
}

.feature-card p {
  color: #555;
  font-size: 1rem;
  line-height: 1.5;
}

/* Botones de acción */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 40px;
  flex-wrap: wrap;
}

.primary-button, .secondary-button {
  padding: 15px 35px;
  font-size: 1.2rem;
  font-weight: 600;
  border-radius: 50px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  text-decoration: none;
}

.primary-button {
  background: #266cee;
  border: none;
  color: white;
  box-shadow: 0 5px 15px rgba(38, 108, 238, 0.3);
}

.primary-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(38, 108, 238, 0.4);
  background: #1a5fd7;
  color: white;
}

.secondary-button {
  background: transparent;
  border: 2px solid #266cee;
  color: #266cee;
}

.secondary-button:hover {
  background: rgba(38, 108, 238, 0.05);
  color: #266cee;
  transform: translateY(-3px);
}

/* Divisor de onda */
.wave-divider {
  display: block;
  position: relative;
  margin-top: -100px;
  z-index: 1;
}

/* Sección de testimonios/pasos */
.testimonials-section {
  padding: 80px 20px;
  background-color: #f8f9fa;
  position: relative;
  z-index: 2;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 50px;
  color: #333;
  position: relative;
  padding-bottom: 15px;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 4px;
  background: #266cee;
  border-radius: 2px;
}

.steps-container {
  display: flex;
  justify-content: center;
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
  flex-wrap: wrap;
}

.step {
  background: white;
  border-radius: 15px;
  padding: 40px 30px;
  width: 300px;
  text-align: center;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid #eaeaea;
}

.step:hover {
  transform: translateY(-10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border-color: #266cee;
}

.step-number {
  width: 50px;
  height: 50px;
  background: #266cee;
  border-radius: 50%;
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.step h3 {
  font-size: 1.5rem;
  margin-bottom: 15px;
  color: #266cee;
  font-weight: 600;
}

.step p {
  color: #666;
  line-height: 1.6;
}

/* Responsividad */
@media (max-width: 992px) {
  .hero-title {
    font-size: 3rem;
  }
  
  .hero-subtitle {
    font-size: 1.3rem;
  }
  
  .feature-cards {
    gap: 20px;
  }
  
  .feature-card {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-subtitle {
    font-size: 1.1rem;
  }
  
  .feature-cards {
    flex-direction: column;
    align-items: center;
  }
  
  .feature-card {
    width: 100%;
    max-width: 350px;
  }
  
  .steps-container {
    flex-direction: column;
    align-items: center;
  }
  
  .step {
    width: 100%;
    max-width: 350px;
  }
  
  .primary-button, .secondary-button {
    width: 100%;
    justify-content: center;
  }
  
  .action-buttons {
    flex-direction: column;
    width: 100%;
    max-width: 350px;
    margin-left: auto;
    margin-right: auto;
  }
}
</style>