document.addEventListener('DOMContentLoaded', () => {
    // Form and Inputs Elements
    const form = document.getElementById('laudo-form');
    const btnLoadDemo = document.getElementById('btn-load-demo');
    const btnReset = document.getElementById('btn-reset');
    const btnPrint = document.getElementById('btn-print');
    
    // Zoom Elements
    const btnZoomIn = document.getElementById('zoom-in');
    const btnZoomOut = document.getElementById('zoom-out');
    const lblZoomLevel = document.getElementById('zoom-level');
    const sheet = document.getElementById('laudo-sheet');
    
    // Special Input Elements for "Outro..." options
    const selectCliente = document.getElementById('cliente_fazenda');
    const inputClienteOutro = document.getElementById('cliente_fazenda_outro');
    
    const selectProduto = document.getElementById('nome_produto');
    const inputProdutoOutro = document.getElementById('nome_produto_outro');
    
    const inputColeta = document.getElementById('responsavel_coleta');
    
    const inputAnalise = document.getElementById('responsavel_analise');
    
    const inputMicrorganismo = document.getElementById('microrganismo');
    
    const radioAmostraOutro = document.getElementById('tipo_amostra_outro_radio');
    const inputAmostraOutro = document.getElementById('tipo_amostra_outro');
    
    // Image Upload Elements
    const file40x = document.getElementById('photo_40x');
    const file100x = document.getElementById('photo_100x');
    const dropzone40x = document.getElementById('dropzone-40x');
    const dropzone100x = document.getElementById('dropzone-100x');
    const imgPreview40x = document.getElementById('img-preview-40x');
    const imgPreview100x = document.getElementById('img-preview-100x');
    const placeholder40x = document.getElementById('placeholder-40x');
    const placeholder100x = document.getElementById('placeholder-100x');

    // Zoom Level state
    let zoomLevel = 100;
    
    // Image data state (Base64)
    let base64Image40x = "";
    let base64Image100x = "";

    // ----------------------------------------------------
    // Product Mapping Database (from Dados.xlsx)
    // ----------------------------------------------------
    const productDatabase = {
        "Bio Hidric": { microrganismo: "Priestia aryabhattai", meio: "SH" },
        "Solubio Raiz Performance": { microrganismo: "Bacillus subtilis", meio: "BAC" },
        "Bio Balance": { microrganismo: "Bacillus amyloliquefaciens", meio: "BAC" },
        "Bio Release": { microrganismo: "Pseudomonas fluorescens", meio: "BAC" },
        "Bio Solubilize": { microrganismo: "Priestia megaterium", meio: "SM" },
        "Tec Bug": { microrganismo: "Chromobacterium subtsugae", meio: "BUG" },
        "Tec Catp": { microrganismo: "Bacillus thuringiensis", meio: "CATP" },
        "Bio Bokashi": { microrganismo: "-", meio: "BAC" },
        "Solu Leaf": { microrganismo: "Bacillus velezensis", meio: "BAC" },
        "Solu Clean": { microrganismo: "Bacillus pumillus", meio: "BAC" },
        "Solu Strong": { microrganismo: "Bacillus amyloliquefaciens", meio: "BAC" },
        "Bio ND": { microrganismo: "Bradyrhizobium japonicum", meio: "Não se aplica" },
        "Bio AZ": { microrganismo: "Azospirillum brasilense", meio: "Não se aplica" },
        "Tec White": { microrganismo: "Beauveria bassian", meio: "WHITE" },
        "Tec Isaria": { microrganismo: "Cordyceps fumosorosea = Isaria fumusorosea", meio: "Não se aplica" }
    };

    // ----------------------------------------------------
    // Utility Functions
    // ----------------------------------------------------
    
    // Date formatting (YYYY-MM-DD -> DD/MM/YYYY)
    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    }

    // Set preview text value
    function setPreviewVal(id, val, isItalic = false) {
        const el = document.getElementById(`val-${id}`);
        if (el) {
            el.textContent = val || '-';
            if (isItalic) {
                el.style.fontStyle = val ? 'italic' : 'normal';
            }
        }
    }

    // Update zoom display
    function updateZoom() {
        lblZoomLevel.textContent = `${zoomLevel}%`;
        sheet.style.transform = `scale(${zoomLevel / 100})`;
        
        // Adjust sheet container padding to compensate for scaled sheet height
        const wrapper = sheet.parentElement;
        if (zoomLevel < 100) {
            wrapper.style.height = 'auto';
        } else {
            // Keep room for scaled up size
            const scaleOffset = (sheet.offsetHeight * (zoomLevel - 100)) / 100;
            wrapper.style.paddingBottom = `${30 + scaleOffset}px`;
        }
    }

    // ----------------------------------------------------
    // Product Selection Trigger
    // ----------------------------------------------------
    selectProduto.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'Outro') {
            inputProdutoOutro.classList.remove('hidden');
            inputProdutoOutro.focus();
            inputMicrorganismo.value = "";
            inputMicrorganismo.placeholder = "Digite o microrganismo";
        } else {
            inputProdutoOutro.classList.add('hidden');
            const data = productDatabase[val];
            if (data) {
                // Set microorganism
                inputMicrorganismo.value = data.microrganismo;
                
                // Select proper medium radio
                setRadioValue('meio_cultura', data.meio);
            }
        }
        updatePreview();
    });

    // Handle visible input triggers for other select items
    [
        { select: selectCliente, input: inputClienteOutro }
    ].forEach(item => {
        item.select.addEventListener('change', (e) => {
            if (e.target.value === 'Outro') {
                item.input.classList.remove('hidden');
                item.input.focus();
            } else {
                item.input.classList.add('hidden');
            }
            updatePreview();
        });
    });

    // ----------------------------------------------------
    // Update Preview Logic
    // ----------------------------------------------------
    
    function updatePreview() {
        const formData = new FormData(form);
        
        // 1. Resolve client name (Select vs Input text)
        let resolvedCliente = formData.get('cliente_fazenda');
        if (resolvedCliente === 'Outro') {
            resolvedCliente = formData.get('cliente_fazenda_outro') || '';
        }
        setPreviewVal('cliente_fazenda', resolvedCliente);

        // 2. Resolve product name
        let resolvedProduto = formData.get('nome_produto');
        if (resolvedProduto === 'Outro') {
            resolvedProduto = formData.get('nome_produto_outro') || '';
        }
        setPreviewVal('nome_produto', resolvedProduto);

        // 3. Resolve collectors and analysts
        let resolvedColeta = formData.get('responsavel_coleta') || '';
        setPreviewVal('responsavel_coleta', resolvedColeta);

        let resolvedAnalise = formData.get('responsavel_analise') || '';
        setPreviewVal('responsavel_analise', resolvedAnalise);

        // 4. Text and Date fields
        setPreviewVal('relatorio_num', formData.get('relatorio_num'));
        setPreviewVal('data_emissao', formatDate(formData.get('data_emissao')));
        setPreviewVal('microrganismo', formData.get('microrganismo'), true);
        setPreviewVal('lote_produto', formData.get('lote_produto'));
        setPreviewVal('lote_meio', formData.get('lote_meio'));
        setPreviewVal('temperatura', formData.get('temperatura'));
        setPreviewVal('ph', formData.get('ph'));
        setPreviewVal('data_multiplicacao', formatDate(formData.get('data_multiplicacao')));
        setPreviewVal('data_coleta', formatDate(formData.get('data_coleta')));
        setPreviewVal('observacoes', formData.get('observacoes'));
        
        setPreviewVal('data_recebimento', formatDate(formData.get('data_recebimento')));
        setPreviewVal('data_analise', formatDate(formData.get('data_analise')));
        setPreviewVal('tecnica_plaqueamento', formData.get('tecnica_plaqueamento'));
        setPreviewVal('diluicoes', formData.get('diluicoes'));
        setPreviewVal('temp_incubacao', formData.get('temp_incubacao'));
        setPreviewVal('tempo_incubacao', formData.get('tempo_incubacao'));
        setPreviewVal('coloracao_gram', formData.get('coloracao_gram'));

        // Show/hide other sample type input based on radio
        const tipoAmostra = formData.get('tipo_amostra');
        if (tipoAmostra === 'Outro') {
            inputAmostraOutro.classList.remove('hidden');
            inputAmostraOutro.required = true;
            const outroTexto = formData.get('tipo_amostra_outro') || '';
            setPreviewVal('tipo_amostra_outro_label', outroTexto);
        } else {
            inputAmostraOutro.classList.add('hidden');
            inputAmostraOutro.required = false;
            setPreviewVal('tipo_amostra_outro_label', '-');
        }

        // 5. Sample Type Checkboxes
        document.getElementById('chk-amostra-agua').textContent = tipoAmostra === 'Água' ? '☒ Água' : '☐ Água';
        document.getElementById('chk-amostra-inoculo').textContent = tipoAmostra === 'Inóculo' ? '☒ Inóculo' : '☐ Inóculo';
        document.getElementById('chk-amostra-meio').textContent = tipoAmostra === 'Meio de cultura' ? '☒ Meio de cultura' : '☐ Meio de cultura';
        document.getElementById('chk-amostra-multiplicado').textContent = tipoAmostra === 'Multiplicado' ? '☒ Multiplicado' : '☐ Multiplicado';
        document.getElementById('chk-amostra-outro').innerHTML = tipoAmostra === 'Outro' 
            ? `☒ Outro: <span id="val-tipo_amostra_outro_label" style="text-decoration: underline; font-weight: bold;">${formData.get('tipo_amostra_outro') || '-'}</span>`
            : `☐ Outro: <span id="val-tipo_amostra_outro_label" style="text-decoration: underline;">-</span>`;

        // Bold selected active items class toggle
        const amostraIds = {
            'Água': 'chk-amostra-agua',
            'Inóculo': 'chk-amostra-inoculo',
            'Meio de cultura': 'chk-amostra-meio',
            'Multiplicado': 'chk-amostra-multiplicado',
            'Outro': 'chk-amostra-outro'
        };
        Object.keys(amostraIds).forEach(k => {
            const el = document.getElementById(amostraIds[k]);
            if (el) {
                if (tipoAmostra === k) el.classList.add('checked-val');
                else el.classList.remove('checked-val');
            }
        });

        // 6. Culture Medium Checkboxes
        const meioCultura = formData.get('meio_cultura');
        const setMediumText = (id, textValue, key) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = meioCultura === key ? `☒ ${textValue}` : `☐ ${textValue}`;
            }
        };
        setMediumText('chk-meio-bac', 'BAC', 'BAC');
        setMediumText('chk-meio-sm', 'SM', 'SM');
        setMediumText('chk-meio-sh', 'SH', 'SH');
        setMediumText('chk-meio-bug', 'BUG', 'BUG');
        setMediumText('chk-meio-catp', 'CATP', 'CATP');
        setMediumText('chk-meio-finish', 'FINISH', 'FINISH');
        setMediumText('chk-meio-white', 'WHITE', 'WHITE');
        setMediumText('chk-meio-na', 'Não se aplica', 'Não se aplica');

        const meioIds = {
            'BAC': 'chk-meio-bac', 'SM': 'chk-meio-sm', 
            'SH': 'chk-meio-sh',
            'BUG': 'chk-meio-bug', 'CATP': 'chk-meio-catp', 'FINISH': 'chk-meio-finish', 
            'WHITE': 'chk-meio-white', 'Não se aplica': 'chk-meio-na'
        };
        Object.keys(meioIds).forEach(k => {
            const el = document.getElementById(meioIds[k]);
            if (el) {
                if (meioCultura === k) el.classList.add('checked-val');
                else el.classList.remove('checked-val');
            }
        });

        // 7. Compressor Type Checkboxes
        const tipoCompressor = formData.get('tipo_compressor');
        document.getElementById('chk-compressor-odontologico').textContent = tipoCompressor === 'Odontológico/Parafuso' ? '☒ Odontológico/Parafuso' : '☐ Odontológico/Parafuso';
        document.getElementById('chk-compressor-radial').textContent = tipoCompressor === 'Radial' ? '☒ Radial' : '☐ Radial';
        document.getElementById('chk-compressor-venturi').textContent = tipoCompressor === 'Venturi' ? '☒ Venturi' : '☐ Venturi';

        const compressorIds = {
            'Odontológico/Parafuso': 'chk-compressor-odontologico',
            'Radial': 'chk-compressor-radial',
            'Venturi': 'chk-compressor-venturi'
        };
        Object.keys(compressorIds).forEach(k => {
            const el = document.getElementById(compressorIds[k]);
            if (el) {
                if (tipoCompressor === k) el.classList.add('checked-val');
                else el.classList.remove('checked-val');
            }
        });

        // 8. Thermal Shock Checkboxes
        const choqueTermico = formData.get('choque_termico');
        document.getElementById('chk-choque-sim').textContent = choqueTermico === 'SIM' ? '☒ SIM' : '☐ SIM';
        document.getElementById('chk-choque-nao').textContent = choqueTermico === 'NÃO' ? '☒ NÃO' : '☐ NÃO';

        const choqueIds = { 'SIM': 'chk-choque-sim', 'NÃO': 'chk-choque-nao' };
        Object.keys(choqueIds).forEach(k => {
            const el = document.getElementById(choqueIds[k]);
            if (el) {
                if (choqueTermico === k) el.classList.add('checked-val');
                else el.classList.remove('checked-val');
            }
        });

        // 9. Qualitative & Other Microorganisms Results Styling
        const resultadoQualitativo = formData.get('resultado_qualitativo') || 'EXCELENTE';
        const outrosMicro = formData.get('outros_microrganismos') || 'PRESENTE';

        const cellQualitativo = document.getElementById('val-resultado_qualitativo');
        const cellOutros = document.getElementById('val-outros_microrganismos');

        cellQualitativo.textContent = resultadoQualitativo;
        cellOutros.textContent = outrosMicro;

        // Reset classes
        cellQualitativo.className = 'result-value';
        cellOutros.className = 'result-value';

        // Add correct class
        cellQualitativo.classList.add(`result-${resultadoQualitativo.toLowerCase()}`);
        cellOutros.classList.add(`result-${outrosMicro.toLowerCase()}`);
        
        // Auto Save to LocalStorage
        saveToLocalStorage();
    }

    // ----------------------------------------------------
    // Image Handler Logic
    // ----------------------------------------------------
    
    function handleImageFile(file, type) {
        if (!file) return;
        
        // Feedback visual imediato de carregamento
        const fileNameEl = type === '40x' 
            ? dropzone40x.querySelector('.file-name') 
            : dropzone100x.querySelector('.file-name');
        if (fileNameEl) {
            fileNameEl.textContent = "Carregando...";
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Redimensionar para tamanho ideal (max 1000px na maior dimensão)
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 1000;
                
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Exportar como JPEG comprimido a 80%
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                if (type === '40x') {
                    base64Image40x = compressedDataUrl;
                    imgPreview40x.src = compressedDataUrl;
                    imgPreview40x.style.display = 'block';
                    placeholder40x.style.display = 'none';
                    if (fileNameEl) fileNameEl.textContent = file.name;
                } else {
                    base64Image100x = compressedDataUrl;
                    imgPreview100x.src = compressedDataUrl;
                    imgPreview100x.style.display = 'block';
                    placeholder100x.style.display = 'none';
                    if (fileNameEl) fileNameEl.textContent = file.name;
                }
                saveToLocalStorage();
            };
            img.onerror = () => {
                console.error("Erro ao processar arquivo como imagem.");
                if (fileNameEl) fileNameEl.textContent = "Erro ao processar!";
            };
            img.src = e.target.result;
        };
        reader.onerror = (err) => {
            console.error("Erro na leitura do arquivo com FileReader:", err);
            if (fileNameEl) fileNameEl.textContent = "Erro ao carregar!";
        };
        reader.readAsDataURL(file);
    }

    // Drag and Drop implementation
    ['40x', '100x'].forEach(type => {
        const dropzone = type === '40x' ? dropzone40x : dropzone100x;
        const fileInput = type === '40x' ? file40x : file100x;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.remove('dragover');
            }, false);
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleImageFile(files[0], type);
            }
        });

        // Clique explícito na dropzone para abrir o seletor de arquivos de forma garantida
        dropzone.addEventListener('click', (e) => {
            if (e.target !== fileInput) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                handleImageFile(files[0], type);
                fileInput.value = ''; // Limpa o input para permitir selecionar o mesmo arquivo novamente
            }
        });
    });

    // ----------------------------------------------------
    // Event Listeners
    // ----------------------------------------------------
    
    // Zoom events
    btnZoomIn.addEventListener('click', () => {
        if (zoomLevel < 150) {
            zoomLevel += 10;
            updateZoom();
        }
    });

    btnZoomOut.addEventListener('click', () => {
        if (zoomLevel > 50) {
            zoomLevel -= 10;
            updateZoom();
        }
    });

    form.addEventListener('input', updatePreview);
    form.addEventListener('change', updatePreview);

    // Print event
    btnPrint.addEventListener('click', () => {
        const originalZoom = zoomLevel;
        zoomLevel = 100;
        updateZoom();
        window.print();
        setTimeout(() => {
            zoomLevel = originalZoom;
            updateZoom();
        }, 500);
    });

    // Reset Form
    btnReset.addEventListener('click', () => {
        if (confirm('Tem certeza de que deseja limpar todos os campos do laudo?')) {
            form.reset();
            
            base64Image40x = "";
            base64Image100x = "";
            
            imgPreview40x.src = "";
            imgPreview40x.style.display = 'none';
            placeholder40x.style.display = 'flex';
            dropzone40x.querySelector('.file-name').textContent = "Nenhuma foto selecionada";
            
            imgPreview100x.src = "";
            imgPreview100x.style.display = 'none';
            placeholder100x.style.display = 'flex';
            dropzone100x.querySelector('.file-name').textContent = "Nenhuma foto selecionada";
            
            inputAmostraOutro.classList.add('hidden');
            inputClienteOutro.classList.add('hidden');
            inputProdutoOutro.classList.add('hidden');
            inputColetaOutro.classList.add('hidden');
            inputAnaliseOutro.classList.add('hidden');
            
            localStorage.removeItem('laudo_micros_state');
            
            setDefaultDates();
            setPredefinedDefaults();
            updatePreview();
        }
    });

    // Load Demo Data
    btnLoadDemo.addEventListener('click', () => {
        document.getElementById('relatorio_num').value = "044.2025";
        document.getElementById('data_emissao').value = "2025-12-10";
        
        // Cliente "Missa" isn't in Excel. Select "Outro" and fill input
        selectCliente.value = "Outro";
        inputClienteOutro.classList.remove('hidden');
        inputClienteOutro.value = "Missa";
        
        setRadioValue('tipo_amostra', 'Multiplicado');
        setRadioValue('meio_cultura', 'BUG');
        setRadioValue('tipo_compressor', 'Odontológico/Parafuso');
        
        // Produto "Tec Bug" is in database
        selectProduto.value = "Tec Bug";
        inputProdutoOutro.classList.add('hidden');
        
        inputMicrorganismo.value = "Chromobacterium"; // As written in original laudo example
        
        document.getElementById('lote_produto').value = "PA00240113";
        document.getElementById('lote_meio').value = "PA021035";
        document.getElementById('temperatura').value = "-";
        document.getElementById('ph').value = "-";
        document.getElementById('data_multiplicacao').value = "2025-12-09";
        document.getElementById('data_coleta').value = "2025-12-10";
        
        // Responsável Coleta: "Hebert Ribeiro" is not in Excel list ("Hebert" is). Choose Outro
        selectColeta.value = "Outro";
        inputColetaOutro.classList.remove('hidden');
        inputColetaOutro.value = "Hebert Ribeiro";
        
        document.getElementById('observacoes').value = "Por meio da análise qualitativa por microscopia, foi possível verificar que o processo de multiplicação resultou alta concentração do microrganismo de interesse, e apresentou baixíssima detecção de outros microrganismos. Tanque 03";
        
        document.getElementById('data_recebimento').value = "2025-12-10";
        document.getElementById('data_analise').value = "2025-12-10";
        document.getElementById('tecnica_plaqueamento').value = "NA";
        document.getElementById('diluicoes').value = "NA";
        document.getElementById('temp_incubacao').value = "NA";
        document.getElementById('tempo_incubacao').value = "NA";
        setRadioValue('choque_termico', 'NÃO');
        document.getElementById('coloracao_gram').value = "Bastonetes gram-negativo, cocos gram-positivo";
        
        // Responsável Análise: "Hebert Ribeiro". Choose Outro
        selectAnalise.value = "Outro";
        inputAnaliseOutro.classList.remove('hidden');
        inputAnaliseOutro.value = "Hebert Ribeiro";
        
        setRadioValue('resultado_qualitativo', 'EXCELENTE');
        setRadioValue('outros_microrganismos', 'PRESENTE');

        // Set demo images (if present locally, we link them)
        imgPreview40x.src = "media_extracted/image1.jpeg";
        imgPreview40x.style.display = 'block';
        placeholder40x.style.display = 'none';
        dropzone40x.querySelector('.file-name').textContent = "image1.jpeg (Exemplo)";
        base64Image40x = "media_extracted/image1.jpeg";

        imgPreview100x.src = "media_extracted/image2.jpeg";
        imgPreview100x.style.display = 'block';
        placeholder100x.style.display = 'none';
        dropzone100x.querySelector('.file-name').textContent = "image2.jpeg (Exemplo)";
        base64Image100x = "media_extracted/image2.jpeg";
        
        updatePreview();
    });

    function setRadioValue(name, value) {
        const radios = document.getElementsByName(name);
        for (let radio of radios) {
            if (radio.value === value) {
                radio.checked = true;
                break;
            }
        }
    }

    // Set default dates to current date
    function setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('data_emissao').value = today;
        document.getElementById('data_coleta').value = today;
        document.getElementById('data_recebimento').value = today;
        document.getElementById('data_analise').value = today;
    }

    // Set predefined defaults requested by user: NA and Hebert
    function setPredefinedDefaults() {
        document.getElementById('tecnica_plaqueamento').value = "NA";
        document.getElementById('diluicoes').value = "NA";
        document.getElementById('temp_incubacao').value = "NA";
        document.getElementById('tempo_incubacao').value = "NA";
        selectColeta.value = "Hebert";
        selectAnalise.value = "Hebert";
    }

    // ----------------------------------------------------
    // LocalStorage State Management
    // ----------------------------------------------------
    
    function saveToLocalStorage() {
        try {
            const state = {
                relatorio_num: document.getElementById('relatorio_num').value,
                data_emissao: document.getElementById('data_emissao').value,
                cliente_fazenda: selectCliente.value,
                cliente_fazenda_outro: inputClienteOutro.value,
                tipo_amostra: getRadioValue('tipo_amostra'),
                tipo_amostra_outro: inputAmostraOutro.value,
                meio_cultura: getRadioValue('meio_cultura'),
                tipo_compressor: getRadioValue('tipo_compressor'),
                nome_produto: selectProduto.value,
                nome_produto_outro: inputProdutoOutro.value,
                microrganismo: inputMicrorganismo.value,
                lote_produto: document.getElementById('lote_produto').value,
                lote_meio: document.getElementById('lote_meio').value,
                temperatura: document.getElementById('temperatura').value,
                ph: document.getElementById('ph').value,
                data_multiplicacao: document.getElementById('data_multiplicacao').value,
                data_coleta: document.getElementById('data_coleta').value,
                responsavel_coleta: inputColeta.value,
                observacoes: document.getElementById('observacoes').value,
                
                data_recebimento: document.getElementById('data_recebimento').value,
                data_analise: document.getElementById('data_analise').value,
                tecnica_plaqueamento: document.getElementById('tecnica_plaqueamento').value,
                diluicoes: document.getElementById('diluicoes').value,
                temp_incubacao: document.getElementById('temp_incubacao').value,
                tempo_incubacao: document.getElementById('tempo_incubacao').value,
                choque_termico: getRadioValue('choque_termico'),
                coloracao_gram: document.getElementById('coloracao_gram').value,
                responsavel_analise: inputAnalise.value,
                
                resultado_qualitativo: getRadioValue('resultado_qualitativo'),
                outros_microrganismos: getRadioValue('outros_microrganismos'),
                
                image40x: base64Image40x.startsWith('data:') ? base64Image40x : "",
                image100x: base64Image100x.startsWith('data:') ? base64Image100x : "",
                image40xName: dropzone40x.querySelector('.file-name').textContent,
                image100xName: dropzone100x.querySelector('.file-name').textContent
            };
            localStorage.setItem('laudo_micros_state', JSON.stringify(state));
        } catch (e) {
            console.warn("Não foi possível salvar o estado no localStorage (provavelmente limite de cota excedido devido a imagens base64):", e);
        }
    }

    function getRadioValue(name) {
        const checked = document.querySelector(`input[name="${name}"]:checked`);
        return checked ? checked.value : "";
    }

    function loadFromLocalStorage() {
        const stored = localStorage.getItem('laudo_micros_state');
        if (!stored) {
            setDefaultDates();
            setPredefinedDefaults();
            updatePreview();
            return;
        }

        try {
            const state = JSON.parse(stored);
            
            document.getElementById('relatorio_num').value = state.relatorio_num || "";
            document.getElementById('data_emissao').value = state.data_emissao || "";
            
            if (state.cliente_fazenda) {
                selectCliente.value = state.cliente_fazenda;
                if (state.cliente_fazenda === 'Outro') {
                    inputClienteOutro.classList.remove('hidden');
                    inputClienteOutro.value = state.cliente_fazenda_outro || "";
                }
            }
            
            if (state.tipo_amostra) setRadioValue('tipo_amostra', state.tipo_amostra);
            inputAmostraOutro.value = state.tipo_amostra_outro || "";
            if (state.meio_cultura) setRadioValue('meio_cultura', state.meio_cultura);
            if (state.tipo_compressor) setRadioValue('tipo_compressor', state.tipo_compressor);
            
            if (state.nome_produto) {
                selectProduto.value = state.nome_produto;
                if (state.nome_produto === 'Outro') {
                    inputProdutoOutro.classList.remove('hidden');
                    inputProdutoOutro.value = state.nome_produto_outro || "";
                }
            }
            
            inputMicrorganismo.value = state.microrganismo || "";
            document.getElementById('lote_produto').value = state.lote_produto || "";
            document.getElementById('lote_meio').value = state.lote_meio || "";
            document.getElementById('temperatura').value = state.temperatura || "";
            document.getElementById('ph').value = state.ph || "";
            document.getElementById('data_multiplicacao').value = state.data_multiplicacao || "";
            document.getElementById('data_coleta').value = state.data_coleta || "";
            
            if (state.responsavel_coleta) {
                inputColeta.value = state.responsavel_coleta;
            }
            
            document.getElementById('observacoes').value = state.observacoes || "";
            
            document.getElementById('data_recebimento').value = state.data_recebimento || "";
            document.getElementById('data_analise').value = state.data_analise || "";
            document.getElementById('tecnica_plaqueamento').value = state.tecnica_plaqueamento || "NA";
            document.getElementById('diluicoes').value = state.diluicoes || "NA";
            document.getElementById('temp_incubacao').value = state.temp_incubacao || "NA";
            document.getElementById('tempo_incubacao').value = state.tempo_incubacao || "NA";
            if (state.choque_termico) setRadioValue('choque_termico', state.choque_termico);
            document.getElementById('coloracao_gram').value = state.coloracao_gram || "";
            
            if (state.responsavel_analise) {
                inputAnalise.value = state.responsavel_analise;
            }
            
            if (state.resultado_qualitativo) setRadioValue('resultado_qualitativo', state.resultado_qualitativo);
            if (state.outros_microrganismos) setRadioValue('outros_microrganismos', state.outros_microrganismos);
            
            if (state.image40x) {
                base64Image40x = state.image40x;
                imgPreview40x.src = state.image40x;
                imgPreview40x.style.display = 'block';
                placeholder40x.style.display = 'none';
                dropzone40x.querySelector('.file-name').textContent = state.image40xName || "Imagem carregada";
            }
            if (state.image100x) {
                base64Image100x = state.image100x;
                imgPreview100x.src = state.image100x;
                imgPreview100x.style.display = 'block';
                placeholder100x.style.display = 'none';
                dropzone100x.querySelector('.file-name').textContent = state.image100xName || "Imagem carregada";
            }
            
            updatePreview();
        } catch (e) {
            console.error("Erro ao carregar estado do LocalStorage:", e);
            setDefaultDates();
            setPredefinedDefaults();
            updatePreview();
        }
    }

    // Initialize application state
    loadFromLocalStorage();
    updateZoom();
});
