// src/services/logger.service.js
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };
  
  // Configuración global del nivel de log
  let currentLogLevel = LOG_LEVELS.INFO;
  
  // Habilitar almacenamiento de logs para debug
  let logsHistory = [];
  const MAX_LOGS_HISTORY = 1000;
  
  const loggerService = {
    // Métodos de logging
    debug(module, message, data = null) {
      this._log(LOG_LEVELS.DEBUG, module, message, data);
    },
    
    info(module, message, data = null) {
      this._log(LOG_LEVELS.INFO, module, message, data);
    },
    
    warn(module, message, data = null) {
      this._log(LOG_LEVELS.WARN, module, message, data);
    },
    
    error(module, message, data = null) {
      this._log(LOG_LEVELS.ERROR, module, message, data);
    },
    
    // Método principal para log
    _log(level, module, message, data) {
      if (level < currentLogLevel) return;
      
      const timestamp = new Date().toISOString();
      const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
      
      // Formatear mensaje
      const logEntry = {
        timestamp,
        level: levelName,
        module,
        message,
        data: data ? this._sanitizeData(data) : null
      };
      
      // Almacenar en el historial
      this._storeLog(logEntry);
      
      // Color según nivel
      let consoleColor = 'color: black;';
      switch (level) {
        case LOG_LEVELS.DEBUG: consoleColor = 'color: gray;'; break;
        case LOG_LEVELS.INFO: consoleColor = 'color: blue;'; break;
        case LOG_LEVELS.WARN: consoleColor = 'color: orange;'; break;
        case LOG_LEVELS.ERROR: consoleColor = 'color: red;'; break;
      }
      
      // Construir mensaje para consola
      const moduleFormatted = `[${module}]`;
      const prefixFormatted = `%c${timestamp} ${levelName} ${moduleFormatted}:`;
      
      // Log a consola
      if (data) {
        console.groupCollapsed(prefixFormatted, consoleColor, message);
        console.dir(data);
        console.groupEnd();
      } else {
        console.log(prefixFormatted, consoleColor, message);
      }
      
      // Para errores, mostrar también el trace
      if (level === LOG_LEVELS.ERROR && data instanceof Error) {
        console.error(data);
      }
    },
    
    // Sanitizar datos para evitar problemas de circular references
    _sanitizeData(data) {
      try {
        if (data instanceof Error) {
          return {
            message: data.message,
            name: data.name,
            stack: data.stack
          };
        }
        
        // Intentar hacer una copia segura
        return JSON.parse(JSON.stringify(data));
      } catch (e) {
        return { 
          error: 'No se pudo serializar el objeto',
          toString: typeof data.toString === 'function' ? data.toString() : 'No disponible'
        };
      }
    },
    
    // Almacenar log en historial
    _storeLog(logEntry) {
      logsHistory.push(logEntry);
      
      // Limitar tamaño del historial
      if (logsHistory.length > MAX_LOGS_HISTORY) {
        logsHistory.shift();
      }
    },
    
    // Cambiar nivel de log
    setLogLevel(level) {
      if (LOG_LEVELS[level] !== undefined) {
        currentLogLevel = LOG_LEVELS[level];
        this.info('LoggerService', `Nivel de log cambiado a ${level}`);
      } else {
        this.error('LoggerService', `Nivel de log inválido: ${level}`);
      }
    },
    
    // Obtener historial de logs
    getLogHistory() {
      return [...logsHistory];
    },
    
    // Exportar logs a texto
    exportLogs() {
      try {
        const logsText = logsHistory.map(log => 
          `${log.timestamp} [${log.level}] [${log.module}] ${log.message} ${log.data ? JSON.stringify(log.data) : ''}`
        ).join('\n');
        
        return logsText;
      } catch (e) {
        this.error('LoggerService', 'Error al exportar logs', e);
        return 'Error al exportar logs: ' + e.message;
      }
    },
    
    // Limpiar historial de logs
    clearLogs() {
      logsHistory = [];
      this.info('LoggerService', 'Historial de logs limpiado');
    }
  };
  
  export default loggerService;