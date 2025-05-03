<template>
    <div class="firma-viewer">
      <div v-if="firma_url" class="firma-container">
        <img :src="firma_url" alt="Firma digital" class="firma-imagen" />
      </div>
      <div v-else class="firma-no-disponible">
        <i class="bi bi-pen"></i>
        <span>No hay firma disponible</span>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'FirmaViewer',
    props: {
      firma_url: {
        type: String,
        default: ''
      }
    }
  }
  </script>
  
  <style scoped>
  .firma-viewer {
    margin: 1rem 0;
  }
  
  .firma-container {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    background-color: #fff;
    display: inline-block;
    max-width: 100%;
  }
  
  .firma-imagen {
    max-width: 100%;
    max-height: 150px;
  }
  
  .firma-no-disponible {
    color: #666;
    font-style: italic;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    border: 1px dashed #ccc;
    border-radius: 4px;
    background-color: #f9f9f9;
  }
  </style>