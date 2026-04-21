// modules/grillas/grillas.js

export function init() {
    console.log("Inicializando módulo Grillas...");

    const btnPrint = document.getElementById('btn-print-grilla');
    if(btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.print();
        });
    }
}
