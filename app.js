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
        document.getElementById('chk-compressor-odontologico').textContent = tipoCompressor === 'Odontológico' ? '☒ Odontológico' : '☐ Odontológico';
        document.getElementById('chk-compressor-parafuso').textContent = tipoCompressor === 'Parafuso' ? '☒ Parafuso' : '☐ Parafuso';
        document.getElementById('chk-compressor-radial').textContent = tipoCompressor === 'Radial' ? '☒ Radial' : '☐ Radial';
        document.getElementById('chk-compressor-venturi').textContent = tipoCompressor === 'Venturi' ? '☒ Venturi' : '☐ Venturi';

        const compressorIds = {
            'Odontológico': 'chk-compressor-odontologico',
            'Parafuso': 'chk-compressor-parafuso',
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

    // Gerar Laudo Event (Auto-Salva no Repositório + Abre Impressão PDF)
    btnPrint.addEventListener('click', async () => {
        // Limpa quaisquer notificações toast visíveis na tela antes de imprimir
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) toastContainer.innerHTML = '';

        const laudoRecord = await saveCurrentLaudo(false); // Sem notificação toast na tela durante a geração do PDF
        if (!laudoRecord) return; // Se não estiver logado, interrompe

        updatePreview();

        const originalZoom = zoomLevel;
        zoomLevel = 100;
        updateZoom();

        setTimeout(() => {
            window.print();
            setTimeout(() => {
                zoomLevel = originalZoom;
                updateZoom();
            }, 300);
        }, 150);
    });

    // Reset Form
    btnReset.addEventListener('click', () => {
        if (confirm('Tem certeza de que deseja limpar todos os campos do laudo?')) {
            form.reset();
            currentEditingLaudoId = null;
            
            // Clear base64 images
            base64Image40x = "";
            base64Image100x = "";
            imgPreview40x.src = "";
            imgPreview40x.style.display = 'none';
            placeholder40x.style.display = 'block';
            dropzone40x.querySelector('.file-name').textContent = "Nenhuma foto selecionada";

            imgPreview100x.src = "";
            imgPreview100x.style.display = 'none';
            placeholder100x.style.display = 'block';
            dropzone100x.querySelector('.file-name').textContent = "Nenhuma foto selecionada";

            // Hide "Outro" inputs
            inputClienteOutro.classList.add('hidden');
            inputProdutoOutro.classList.add('hidden');
            inputAmostraOutro.classList.add('hidden');

            setDefaultDates();
            setPredefinedDefaults();
            updatePreview();
            showToast('Formulário limpo com sucesso.', 'info');
        }
    });

    // Load Demo Data
    btnLoadDemo.addEventListener('click', () => {
        document.getElementById('relatorio_num').value = "044.2025";
        setDefaultDates();
        
        selectCliente.value = "Gilson Adriano Bomfim - Fazenda Sagrada Fámilia";
        inputClienteOutro.classList.add('hidden');

        setRadioValue('tipo_amostra', 'Multiplicado');
        inputAmostraOutro.classList.add('hidden');

        selectProduto.value = "Bio Balance";
        inputProdutoOutro.classList.add('hidden');
        inputMicrorganismo.value = "Bacillus amyloliquefaciens";

        setRadioValue('meio_cultura', 'BAC');
        setRadioValue('tipo_compressor', 'Odontológico');

        document.getElementById('lote_produto').value = "LT-2025-019";
        document.getElementById('lote_meio').value = "LM-884";
        document.getElementById('temperatura').value = "28";
        document.getElementById('ph').value = "6.8";

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        document.getElementById('data_multiplicacao').value = yesterdayStr;
        document.getElementById('data_coleta').value = yesterdayStr;
        
        const currentUser = AuthManager.getCurrentUser();
        inputColeta.value = currentUser ? currentUser.name : "João Silva";
        inputAnalise.value = currentUser ? currentUser.name : "João Silva";

        document.getElementById('observacoes').value = DEFAULT_OBSERVACAO_TEXT;

        document.getElementById('data_recebimento').value = yesterdayStr;
        document.getElementById('data_analise').value = new Date().toISOString().split('T')[0];
        
        document.getElementById('tecnica_plaqueamento').value = "NA";
        document.getElementById('diluicoes').value = "NA";
        document.getElementById('temp_incubacao').value = "NA";
        document.getElementById('tempo_incubacao').value = "NA";
        setRadioValue('choque_termico', 'NÃO');
        document.getElementById('coloracao_gram').value = "Bastonetes gram-positivos com presença de endósporos viáveis";

        setRadioValue('resultado_qualitativo', 'EXCELENTE');
        setRadioValue('outros_microrganismos', 'PRESENTE');

        // Set demo images
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
        showToast('Dados de exemplo carregados!', 'success');
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

    function getTodayLocalDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function setDefaultDates() {
        const today = getTodayLocalDate();
        document.getElementById('data_emissao').value = today; // Sempre garante a data do dia em que abriu o sistema
        if (!document.getElementById('data_coleta').value) document.getElementById('data_coleta').value = today;
        if (!document.getElementById('data_recebimento').value) document.getElementById('data_recebimento').value = today;
        if (!document.getElementById('data_analise').value) document.getElementById('data_analise').value = today;
    }

    const DEFAULT_OBSERVACAO_TEXT = "Por meio da análise qualitativa por microscopia, foi possível verificar que o processo de multiplicação resultou alta concentração do microrganismo de interesse, e não apresentou outros microrganismos";

    function setPredefinedDefaults() {
        document.getElementById('tecnica_plaqueamento').value = "NA";
        document.getElementById('diluicoes').value = "NA";
        document.getElementById('temp_incubacao').value = "NA";
        document.getElementById('tempo_incubacao').value = "NA";
        
        const obsField = document.getElementById('observacoes');
        if (obsField && !obsField.value.trim()) {
            obsField.value = DEFAULT_OBSERVACAO_TEXT;
        }

        const currentUser = AuthManager.getCurrentUser();
        if (currentUser) {
            const cleanName = currentUser.name.replace(/\s*\([^)]*\)/g, '').trim();
            if (!inputColeta.value || inputColeta.value.includes('Admin Principal')) inputColeta.value = cleanName;
            if (!inputAnalise.value || inputAnalise.value.includes('Admin Principal')) inputAnalise.value = cleanName;
        }
    }

    // Button to insert standard Observações text
    document.getElementById('btn-insert-obs-template')?.addEventListener('click', () => {
        const obsField = document.getElementById('observacoes');
        if (obsField) {
            obsField.value = DEFAULT_OBSERVACAO_TEXT;
            updatePreview();
            showToast('Texto padrão inserido em Observações com sucesso!', 'info');
        }
    });

    // ----------------------------------------------------
    // State & Form Extraction Helpers
    // ----------------------------------------------------
    let currentEditingLaudoId = null;

    function getFormState() {
        return {
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
            responsavel_coleta: (inputColeta.value || "").replace(/\s*\([^)]*\)/g, '').trim(),
            observacoes: document.getElementById('observacoes').value,
            
            data_recebimento: document.getElementById('data_recebimento').value,
            data_analise: document.getElementById('data_analise').value,
            tecnica_plaqueamento: document.getElementById('tecnica_plaqueamento').value,
            diluicoes: document.getElementById('diluicoes').value,
            temp_incubacao: document.getElementById('temp_incubacao').value,
            tempo_incubacao: document.getElementById('tempo_incubacao').value,
            choque_termico: getRadioValue('choque_termico'),
            coloracao_gram: document.getElementById('coloracao_gram').value,
            responsavel_analise: (inputAnalise.value || "").replace(/\s*\([^)]*\)/g, '').trim(),
            
            resultado_qualitativo: getRadioValue('resultado_qualitativo'),
            outros_microrganismos: getRadioValue('outros_microrganismos'),
            
            image40x: base64Image40x,
            image100x: base64Image100x,
            image40xName: dropzone40x.querySelector('.file-name').textContent,
            image100xName: dropzone100x.querySelector('.file-name').textContent
        };
    }

    function saveToLocalStorage() {
        try {
            const state = getFormState();
            localStorage.setItem('laudo_micros_state', JSON.stringify(state));
        } catch (e) {
            console.warn("Quota excedida no LocalStorage para imagens.", e);
        }
    }

    function getRadioValue(name) {
        const checked = document.querySelector(`input[name="${name}"]:checked`);
        return checked ? checked.value : "";
    }

    function loadFormState(state) {
        if (!state) return;
        
        if (state.relatorio_num) document.getElementById('relatorio_num').value = state.relatorio_num;
        if (state.data_emissao) document.getElementById('data_emissao').value = state.data_emissao;
        
        if (state.cliente_fazenda) {
            selectCliente.value = state.cliente_fazenda;
            if (state.cliente_fazenda === 'Outro') {
                inputClienteOutro.classList.remove('hidden');
                inputClienteOutro.value = state.cliente_fazenda_outro || "";
            } else {
                inputClienteOutro.classList.add('hidden');
            }
        }
        
        if (state.tipo_amostra) {
            setRadioValue('tipo_amostra', state.tipo_amostra);
            if (state.tipo_amostra === 'Outro') {
                inputAmostraOutro.classList.remove('hidden');
                inputAmostraOutro.value = state.tipo_amostra_outro || "";
            } else {
                inputAmostraOutro.classList.add('hidden');
            }
        }
        
        if (state.meio_cultura) setRadioValue('meio_cultura', state.meio_cultura);
        if (state.tipo_compressor) setRadioValue('tipo_compressor', state.tipo_compressor);
        
        if (state.nome_produto) {
            selectProduto.value = state.nome_produto;
            if (state.nome_produto === 'Outro') {
                inputProdutoOutro.classList.remove('hidden');
                inputProdutoOutro.value = state.nome_produto_outro || "";
            } else {
                inputProdutoOutro.classList.add('hidden');
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
            inputColeta.value = state.responsavel_coleta.replace(/\s*\([^)]*\)/g, '').trim();
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
            inputAnalise.value = state.responsavel_analise.replace(/\s*\([^)]*\)/g, '').trim();
        }
        
        if (state.resultado_qualitativo) setRadioValue('resultado_qualitativo', state.resultado_qualitativo);
        if (state.outros_microrganismos) setRadioValue('outros_microrganismos', state.outros_microrganismos);
        
        if (state.image40x) {
            base64Image40x = state.image40x;
            imgPreview40x.src = state.image40x;
            imgPreview40x.style.display = 'block';
            placeholder40x.style.display = 'none';
            dropzone40x.querySelector('.file-name').textContent = state.image40xName || "Imagem carregada";
        } else {
            base64Image40x = "";
            imgPreview40x.src = "";
            imgPreview40x.style.display = 'none';
            placeholder40x.style.display = 'block';
            dropzone40x.querySelector('.file-name').textContent = "Nenhuma foto selecionada";
        }

        if (state.image100x) {
            base64Image100x = state.image100x;
            imgPreview100x.src = state.image100x;
            imgPreview100x.style.display = 'block';
            placeholder100x.style.display = 'none';
            dropzone100x.querySelector('.file-name').textContent = state.image100xName || "Imagem carregada";
        } else {
            base64Image100x = "";
            imgPreview100x.src = "";
            imgPreview100x.style.display = 'none';
            placeholder100x.style.display = 'block';
            dropzone100x.querySelector('.file-name').textContent = "Nenhuma foto selecionada";
        }
        
        updatePreview();
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
            loadFormState(state);
            
            // Sempre garante a data de emissão como a data atual do dia que o sistema é aberto (exceto ao editar um laudo salvo do repositório)
            if (!currentEditingLaudoId) {
                document.getElementById('data_emissao').value = getTodayLocalDate();
            }
            updatePreview();
        } catch (e) {
            console.error("Erro ao carregar estado do LocalStorage:", e);
            setDefaultDates();
            setPredefinedDefaults();
            updatePreview();
        }
    }

    // ----------------------------------------------------
    // Save Laudo into IndexedDB
    // ----------------------------------------------------
    async function saveCurrentLaudo(showNotification = true) {
        const user = AuthManager.getCurrentUser();
        if (!user) {
            openModal('modal-login');
            showToast('Por favor, faça login para salvar laudos.', 'info');
            return null;
        }

        const state = getFormState();
        const laudoId = currentEditingLaudoId || ('laudo_' + Date.now());

        let coordName = null;
        if (user.role === 'consultor' && user.coordinatorId) {
            const users = await LaudoDB.getUsers();
            const coord = users.find(u => u.id === user.coordinatorId);
            if (coord) coordName = coord.name;
        }

        const laudoRecord = {
            id: laudoId,
            relatorio_num: state.relatorio_num || 'Sem Nº',
            cliente_fazenda: state.cliente_fazenda === 'Outro' ? state.cliente_fazenda_outro : state.cliente_fazenda,
            nome_produto: state.nome_produto === 'Outro' ? state.nome_produto_outro : state.nome_produto,
            microrganismo: state.microrganismo,
            data_emissao: state.data_emissao,
            data_analise: state.data_analise,
            authorId: user.id,
            authorName: user.name,
            authorRole: user.role,
            coordinatorId: user.coordinatorId || (user.role === 'coordenador' ? user.id : null),
            coordinatorName: coordName || (user.role === 'coordenador' ? user.name : null),
            createdAt: new Date().toISOString(),
            formData: state
        };

        await LaudoDB.saveLaudo(laudoRecord);
        currentEditingLaudoId = laudoId;
        saveToLocalStorage();

        if (showNotification) {
            showToast(`Laudo Nº ${laudoRecord.relatorio_num} salvo no sistema com sucesso!`, 'success');
        }
        return laudoRecord;
    }

    // ----------------------------------------------------
    // Modal Helpers & Handlers
    // ----------------------------------------------------
    // ----------------------------------------------------
    // AUTHENTICATION & SECURITY SYSTEM
    // ----------------------------------------------------
    let failedLoginAttempts = 0;
    let lockoutUntil = 0;

    async function populateRegisterCoordinators() {
        const select = document.getElementById('reg-coordinator');
        if (!select) return;
        const users = await LaudoDB.getUsers();
        const coords = users.filter(u => u.role === 'coordenador');
        select.innerHTML = coords.length ? 
            coords.map(c => `<option value="${c.id}">${c.name}</option>`).join('') :
            '<option value="">Nenhum coordenador disponível</option>';
    }

    function openModal(id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('active');
            if (id === 'modal-login') {
                populateRegisterCoordinators();
            }
        }
    }

    function closeModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    }

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.currentTarget.getAttribute('data-close');
            closeModal(modalId);
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && overlay.id !== 'modal-login') {
                overlay.classList.remove('active');
            }
        });
    });

    // Auth Segmented Control Tab Switching (Entrar vs Novo Consultor)
    const tabLoginBtn = document.getElementById('tab-login-btn');
    const tabRegisterBtn = document.getElementById('tab-register-btn');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register-consultant');

    if (tabLoginBtn && tabRegisterBtn) {
        tabLoginBtn.addEventListener('click', () => {
            tabLoginBtn.classList.add('active');
            tabRegisterBtn.classList.remove('active');

            formLogin.classList.remove('hidden');
            formRegister.classList.add('hidden');
        });

        tabRegisterBtn.addEventListener('click', () => {
            tabRegisterBtn.classList.add('active');
            tabLoginBtn.classList.remove('active');

            formRegister.classList.remove('hidden');
            formLogin.classList.add('hidden');
            populateRegisterCoordinators();
        });
    }

    // Toggle Password Visibility (Eye Icon)
    document.querySelectorAll('.toggle-password-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnTarget = e.currentTarget;
            const targetId = btnTarget.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = btnTarget.querySelector('i');

            if (input && icon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });
    });

    // Login Form Handler
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. Verificação de Armadilha Honeypot
            const hpVal = document.getElementById('login-hp')?.value;
            if (hpVal && hpVal.trim() !== '') {
                showToast('Acesso Bloqueado: Atividade automatizada detectada.', 'error');
                return;
            }

            // 2. Verificação de Bloqueio por Força Bruta
            if (Date.now() < lockoutUntil) {
                const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
                showToast(`Acesso bloqueado temporariamente! Tente em ${remaining} segundos.`, 'error');
                return;
            }

            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            
            const res = await AuthManager.login(email, pass);
            if (res.success) {
                failedLoginAttempts = 0;
                closeModal('modal-login');
                renderUserSessionBar();
                setPredefinedDefaults();

                if (res.user.mustChangePassword) {
                    showToast(`Bem-vindo, ${res.user.name}! Por segurança, por favor altere sua senha de acesso inicial.`, 'warning');
                    setTimeout(() => {
                        openModal('modal-change-password');
                    }, 400);
                } else {
                    showToast(`Bem-vindo, ${res.user.name}!`, 'success');
                    checkFirstLoginClients();
                }
            } else {
                failedLoginAttempts++;
                if (failedLoginAttempts >= 5) {
                    lockoutUntil = Date.now() + 30000;
                    showToast('Múltiplas falhas! Acesso bloqueado por 30 segundos por segurança.', 'error');
                } else {
                    showToast(res.message, 'error');
                }
            }
        });
    }

    // Forgot Password Click Handler (Firebase Auth)
    document.getElementById('btn-forgot-password')?.addEventListener('click', async () => {
        const email = document.getElementById('login-email')?.value;
        if (!email || !email.trim()) {
            showToast('Por favor, digite seu e-mail no campo acima para receber o link de redefinição.', 'info');
            document.getElementById('login-email')?.focus();
            return;
        }

        showToast('Enviando e-mail de redefinição...', 'info');
        const res = await AuthManager.resetPasswordByEmail(email);
        if (res.success) {
            showToast(res.message, 'success');
        } else {
            showToast(res.message, 'error');
        }
    });

    // Consultant Auto-Registration Handler
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. Verificação de Armadilha Honeypot
            const hpVal = document.getElementById('reg-hp')?.value;
            if (hpVal && hpVal.trim() !== '') {
                showToast('Cadastro Bloqueado: Atividade automatizada detectada.', 'error');
                return;
            }

            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;
            const coordId = document.getElementById('reg-coordinator').value;

            const res = await AuthManager.registerConsultant(name, email, pass, coordId);
            if (res.success) {
                closeModal('modal-login');
                renderUserSessionBar();
                setPredefinedDefaults();

                if (pass === '123') {
                    showToast(`Cadastro realizado! Por favor, crie sua nova senha pessoal.`, 'warning');
                    setTimeout(() => {
                        openModal('modal-change-password');
                    }, 400);
                } else {
                    showToast(`Cadastro realizado com sucesso! Bem-vindo, ${res.user.name}.`, 'success');
                    checkFirstLoginClients();
                }
            } else {
                showToast(res.message, 'error');
            }
        });
    }

    // Change Password Form Handler
    const formChangePassword = document.getElementById('form-change-password');
    if (formChangePassword) {
        formChangePassword.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = AuthManager.getCurrentUser();
            if (!user) return;

            const newPass = document.getElementById('change-pass-new').value.trim();
            const confirmPass = document.getElementById('change-pass-confirm').value.trim();

            if (newPass !== confirmPass) {
                showToast('A confirmação de senha não confere. Digite a mesma senha nos dois campos.', 'error');
                return;
            }

            const res = await AuthManager.changePassword(user.id, newPass);
            if (res.success) {
                closeModal('modal-change-password');
                showToast('Sua nova senha foi salva com sucesso!', 'success');
                checkFirstLoginClients();
            } else {
                showToast(res.message, 'error');
            }
        });
    }

    // ----------------------------------------------------
    // User Session Bar & Client Management
    // ----------------------------------------------------
    async function renderUserSessionBar() {
        const bar = document.getElementById('user-session-bar');
        if (!bar) return;

        const user = AuthManager.getCurrentUser();
        if (!user) {
            bar.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar" style="background: #64748b;"><i class="fa-solid fa-lock"></i></div>
                    <div class="user-details">
                        <span class="user-name">Não Conectado</span>
                        <span class="user-role-badge" style="background: #64748b; color: white;">Visitante</span>
                    </div>
                </div>
                <button type="button" class="user-action-btn" id="btn-open-login">
                    <i class="fa-solid fa-right-to-bracket"></i> Entrar
                </button>
            `;
            document.getElementById('btn-open-login')?.addEventListener('click', () => openModal('modal-login'));
            openModal('modal-login');
            return;
        }

        populateClientDropdown();

        let roleBadgeClass = 'badge-role-consultor';
        let roleLabel = 'Consultor';
        let roleIcon = 'fa-microscope';

        if (user.role === 'admin') {
            roleBadgeClass = 'badge-role-admin';
            roleLabel = 'Admin Principal';
            roleIcon = 'fa-crown';
        } else if (user.role === 'coordenador') {
            roleBadgeClass = 'badge-role-coordenador';
            roleLabel = 'Coordenador';
            roleIcon = 'fa-user-tie';
        }

        const firstLetter = user.name ? user.name.charAt(0).toUpperCase() : 'U';

        let actionButtonsHTML = `
            <button type="button" class="user-action-btn" id="btn-open-clients-bar" title="Meus Clientes e Fazendas">
                <i class="fa-solid fa-tractor"></i> Clientes
            </button>
            <button type="button" class="user-action-btn" id="btn-open-laudos-bar" title="Repositório de Laudos">
                <i class="fa-solid fa-folder-open"></i> Laudos
            </button>
        `;

        if (user.role === 'admin') {
            actionButtonsHTML += `
                <button type="button" class="user-action-btn" id="btn-open-users-bar" title="Gerenciar Usuários">
                    <i class="fa-solid fa-users-gear"></i> Usuários
                </button>
            `;
        } else if (user.role === 'coordenador') {
            actionButtonsHTML += `
                <button type="button" class="user-action-btn" id="btn-open-equipe-bar" title="Minha Equipe">
                    <i class="fa-solid fa-users"></i> Equipe
                </button>
            `;
        }

        actionButtonsHTML += `
            <button type="button" class="user-action-btn" id="btn-open-change-pass-bar" title="Alterar Minha Senha">
                <i class="fa-solid fa-key"></i> Senha
            </button>
        `;

        bar.innerHTML = `
            <div class="user-top-row">
                <div class="user-info">
                    <div class="user-avatar">${firstLetter}</div>
                    <div class="user-details">
                        <span class="user-name" title="${user.name}">${user.name}</span>
                        <span class="user-role-badge ${roleBadgeClass}">
                            <i class="fa-solid ${roleIcon}"></i> ${roleLabel}
                        </span>
                    </div>
                </div>
                <button type="button" class="user-action-btn btn-logout" id="btn-logout-bar" title="Sair / Trocar Usuário">
                    <i class="fa-solid fa-right-from-bracket"></i> Sair
                </button>
            </div>
            <div class="user-actions">
                ${actionButtonsHTML}
            </div>
        `;

        document.getElementById('btn-open-change-pass-bar')?.addEventListener('click', () => {
            openModal('modal-change-password');
        });

        document.getElementById('btn-open-clients-bar')?.addEventListener('click', () => {
            openModal('modal-clients');
            renderClientsManagement();
        });

        document.getElementById('btn-open-laudos-bar')?.addEventListener('click', () => {
            openModal('modal-laudos');
            renderLaudosRepository();
        });

        document.getElementById('btn-open-users-bar')?.addEventListener('click', () => {
            openModal('modal-users');
            renderUsersManagement();
        });

        document.getElementById('btn-open-equipe-bar')?.addEventListener('click', () => {
            openModal('modal-equipe');
            renderTeamView();
        });

        document.getElementById('btn-logout-bar')?.addEventListener('click', () => {
            AuthManager.logout();
            renderUserSessionBar();
            showToast('Sessão encerrada com sucesso.', 'info');
        });
    }

    // Populate Client Select Box strictly with User's Personal Clients
    async function populateClientDropdown() {
        const user = AuthManager.getCurrentUser();
        if (!user) return;

        const allClients = await LaudoDB.getClients();
        const myClients = allClients.filter(c => c.userId === user.id);

        const select = document.getElementById('cliente_fazenda');
        if (!select) return;

        const currentValue = select.value;

        let html = '<option value="" disabled selected>Selecione um Cliente / Fazenda</option>';

        if (myClients.length > 0) {
            html += '<optgroup label="⭐ Meus Clientes Cadastrados">';
            myClients.forEach(c => {
                html += `<option value="${c.name}">${c.name}</option>`;
            });
            html += '</optgroup>';
        } else {
            html += '<option value="" disabled>Nenhum cliente cadastrado ainda. Adicione o 1º cliente!</option>';
        }

        html += '<option value="Outro">Outro...</option>';

        select.innerHTML = html;
        if (currentValue) select.value = currentValue;
    }

    // Check First Login (If user has 0 personal clients)
    async function checkFirstLoginClients() {
        const user = AuthManager.getCurrentUser();
        if (!user) return;

        const allClients = await LaudoDB.getClients();
        const myClients = allClients.filter(c => c.userId === user.id);

        if (myClients.length === 0) {
            setTimeout(() => {
                openModal('modal-client-welcome');
            }, 400);
        }
    }

    // Render Client Management Table inside Modal
    async function renderClientsManagement() {
        const tbody = document.getElementById('clients-table-body');
        if (!tbody) return;

        const user = AuthManager.getCurrentUser();
        if (!user) return;

        const allClients = await LaudoDB.getClients();
        const myClients = allClients.filter(c => c.userId === user.id);

        if (myClients.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="2" style="text-align: center; color: var(--text-muted); padding: 20px;">
                        Você ainda não possui nenhum cliente/fazenda cadastrado. Clique no botão acima para adicionar.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = myClients.map(c => `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td style="text-align: right;">
                    <div class="table-actions" style="justify-content: flex-end;">
                        <button type="button" class="btn-sm-action btn-view" onclick="editClientFromTable('${c.id}')" title="Editar">
                            <i class="fa-solid fa-pen"></i> Editar
                        </button>
                        <button type="button" class="btn-sm-action btn-del" onclick="deleteClientFromTable('${c.id}')" title="Excluir">
                            <i class="fa-solid fa-trash"></i> Excluir
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    window.editClientFromTable = async function(id) {
        const clients = await LaudoDB.getClients();
        const found = clients.find(c => c.id === id);
        if (!found) return;

        document.getElementById('client-form-title').textContent = 'Editar Cliente / Fazenda';
        document.getElementById('client-edit-id').value = found.id;
        document.getElementById('client-input-name').value = found.name;

        document.getElementById('form-client-edit').classList.remove('hidden');
    };

    window.deleteClientFromTable = async function(id) {
        if (confirm("Tem certeza que deseja excluir este cliente/fazenda?")) {
            await LaudoDB.deleteClient(id);
            showToast("Cliente removido com sucesso.", 'info');
            await populateClientDropdown();
            renderClientsManagement();
        }
    };

    document.getElementById('btn-show-add-client')?.addEventListener('click', () => {
        document.getElementById('client-form-title').textContent = 'Cadastrar Cliente / Fazenda';
        document.getElementById('client-edit-id').value = '';
        document.getElementById('client-input-name').value = '';
        document.getElementById('form-client-edit').classList.remove('hidden');
    });

    document.getElementById('btn-cancel-client')?.addEventListener('click', () => {
        document.getElementById('form-client-edit').classList.add('hidden');
    });

    // Form Client Edit/Add Submit
    const formClientEdit = document.getElementById('form-client-edit');
    if (formClientEdit) {
        formClientEdit.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = AuthManager.getCurrentUser();
            if (!user) return;

            const editId = document.getElementById('client-edit-id').value;
            const name = document.getElementById('client-input-name').value.trim();

            const clientRecord = {
                id: editId || ('cli_' + Date.now()),
                userId: user.id,
                name: name
            };

            await LaudoDB.saveClient(clientRecord);
            document.getElementById('form-client-edit').classList.add('hidden');
            showToast(`Cliente "${name}" salvo com sucesso!`, 'success');
            await populateClientDropdown();
            renderClientsManagement();
        });
    }

    // Dynamic Row Adder for Welcome Modal (Adicionar Mais Fazendas)
    let welcomeClientCounter = 1;
    const btnAddMoreWelcome = document.getElementById('btn-add-more-welcome-clients');
    if (btnAddMoreWelcome) {
        btnAddMoreWelcome.addEventListener('click', () => {
            welcomeClientCounter++;
            const container = document.getElementById('welcome-clients-list');
            if (!container) return;

            const row = document.createElement('div');
            row.className = 'form-group welcome-client-row';
            row.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                    <label style="font-size: 11px; font-weight: 700; color: var(--text-secondary);">CLIENTE / FAZENDA ${welcomeClientCounter}</label>
                    <button type="button" class="btn-remove-welcome-row" style="background: none; border: none; color: #ef4444; font-size: 11px; cursor: pointer; padding: 2px 4px; font-weight: 600;" title="Remover esta linha">
                        <i class="fa-solid fa-trash-can"></i> Remover
                    </button>
                </div>
                <input type="text" class="form-control welcome-client-input" placeholder="Ex: Nome do Cliente - Nome da Fazenda" required>
            `;

            row.querySelector('.btn-remove-welcome-row')?.addEventListener('click', () => {
                row.remove();
            });

            container.appendChild(row);
            row.querySelector('input')?.focus();
        });
    }

    // Form First Client Welcome Submit (Salvar 1 ou múltiplos clientes)
    const formFirstClient = document.getElementById('form-first-client');
    if (formFirstClient) {
        formFirstClient.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = AuthManager.getCurrentUser();
            if (!user) return;

            const inputs = document.querySelectorAll('.welcome-client-input');
            const savedNames = [];

            for (let i = 0; i < inputs.length; i++) {
                const name = inputs[i].value.trim();
                if (name) {
                    const clientRecord = {
                        id: 'cli_' + Date.now() + '_' + i,
                        userId: user.id,
                        name: name
                    };
                    await LaudoDB.saveClient(clientRecord);
                    savedNames.push(name);
                }
            }

            closeModal('modal-client-welcome');
            await populateClientDropdown();

            if (savedNames.length > 0) {
                const selectClient = document.getElementById('cliente_fazenda');
                if (selectClient) {
                    selectClient.value = savedNames[0];
                    selectClient.dispatchEvent(new Event('change'));
                }
            }

            if (savedNames.length === 1) {
                showToast(`Cliente "${savedNames[0]}" cadastrado com sucesso!`, 'success');
            } else if (savedNames.length > 1) {
                showToast(`${savedNames.length} Clientes/Fazendas cadastrados com sucesso!`, 'success');
            }
        });
    }

    // ----------------------------------------------------
    // Laudos Repository Rendering & Hierarchy Filtering
    // ----------------------------------------------------
    async function renderLaudosRepository() {
        const tbody = document.getElementById('laudos-table-body');
        const badge = document.getElementById('laudos-count-badge');
        const authorSelect = document.getElementById('filter-author');
        if (!tbody) return;

        const currentUser = AuthManager.getCurrentUser();
        const allLaudos = await LaudoDB.getLaudos();
        const accessibleLaudos = await AuthManager.filterAccessibleLaudos(allLaudos, currentUser);
        const allUsers = await LaudoDB.getUsers();

        // Populate Author Select filter
        if (authorSelect) {
            const authors = [...new Set(accessibleLaudos.map(l => l.authorId))];
            let optionsHTML = '<option value="">Todos os Responsáveis</option>';
            authors.forEach(authId => {
                const usr = allUsers.find(u => u.id === authId);
                const laudoSample = accessibleLaudos.find(l => l.authorId === authId);
                const name = usr ? usr.name : (laudoSample ? `${laudoSample.authorName} (Ex-Usuário)` : 'Desconhecido');
                optionsHTML += `<option value="${authId}">${name}</option>`;
            });
            authorSelect.innerHTML = optionsHTML;
        }

        async function filterAndDisplay() {
            const search = (document.getElementById('filter-search')?.value || '').toLowerCase().trim();
            const selectedAuthor = document.getElementById('filter-author')?.value || '';
            const selectedDate = document.getElementById('filter-date')?.value || '';

            const filtered = accessibleLaudos.filter(l => {
                const matchesSearch = !search || 
                    (l.relatorio_num && l.relatorio_num.toLowerCase().includes(search)) ||
                    (l.cliente_fazenda && l.cliente_fazenda.toLowerCase().includes(search)) ||
                    (l.nome_produto && l.nome_produto.toLowerCase().includes(search)) ||
                    (l.authorName && l.authorName.toLowerCase().includes(search));

                const matchesAuthor = !selectedAuthor || l.authorId === selectedAuthor;
                const matchesDate = !selectedDate || l.data_emissao === selectedDate;

                return matchesSearch && matchesAuthor && matchesDate;
            });

            badge.textContent = filtered.length;

            if (filtered.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">
                            <i class="fa-solid fa-folder-open" style="font-size: 24px; margin-bottom: 8px;"></i><br>
                            Nenhum laudo encontrado no sistema para a sua permissão/filtro.
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = filtered.map(l => {
                let roleClass = 'badge-role-consultor';
                let roleLabel = 'Consultor';
                if (l.authorRole === 'admin') {
                    roleClass = 'badge-role-admin';
                    roleLabel = 'Admin';
                } else if (l.authorRole === 'coordenador') {
                    roleClass = 'badge-role-coordenador';
                    roleLabel = 'Coordenador';
                }

                const formattedDate = l.data_emissao ? formatDate(l.data_emissao) : '-';
                const isUserActive = allUsers.some(u => u.id === l.authorId);
                const authorDisplay = l.authorName ? (isUserActive ? l.authorName : `${l.authorName} <span style="font-size:10px; color:#64748b;">(Ex-Usuário)</span>`) : '-';

                return `
                    <tr>
                        <td><strong>${l.relatorio_num || '-'}</strong></td>
                        <td>${l.cliente_fazenda || '-'}</td>
                        <td>${l.nome_produto || '-'}</td>
                        <td><em style="color: #004d20;">${l.microrganismo || '-'}</em></td>
                        <td>${formattedDate}</td>
                        <td>${authorDisplay}</td>
                        <td><span class="user-role-badge ${roleClass}" style="font-size: 8px;">${roleLabel}</span></td>
                        <td style="text-align: right;">
                            <div class="table-actions" style="justify-content: flex-end;">
                                <button type="button" class="btn-sm-action btn-view" onclick="loadLaudoFromRepository('${l.id}')" title="Editar / Carregar">
                                    <i class="fa-solid fa-pen-to-square"></i> Editar
                                </button>
                                <button type="button" class="btn-sm-action btn-print-sm" onclick="printLaudoFromRepository('${l.id}')" title="Imprimir PDF">
                                    <i class="fa-solid fa-print"></i> PDF
                                </button>
                                <button type="button" class="btn-sm-action btn-del" onclick="deleteLaudoFromRepository('${l.id}')" title="Excluir">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        document.getElementById('filter-search')?.addEventListener('input', filterAndDisplay);
        document.getElementById('filter-author')?.addEventListener('change', filterAndDisplay);
        document.getElementById('filter-date')?.addEventListener('change', filterAndDisplay);

        filterAndDisplay();
    }

    window.loadLaudoFromRepository = async function(id) {
        const laudos = await LaudoDB.getLaudos();
        const found = laudos.find(l => l.id === id);
        if (found && found.formData) {
            currentEditingLaudoId = found.id;
            loadFormState(found.formData);
            closeModal('modal-laudos');
            showToast(`Laudo Nº ${found.relatorio_num} carregado no editor!`, 'success');
        }
    };

    window.printLaudoFromRepository = async function(id) {
        const laudos = await LaudoDB.getLaudos();
        const found = laudos.find(l => l.id === id);
        if (found && found.formData) {
            currentEditingLaudoId = found.id;
            loadFormState(found.formData);
            closeModal('modal-laudos');
            setTimeout(() => window.print(), 300);
        }
    };

    window.deleteLaudoFromRepository = async function(id) {
        if (confirm("Tem certeza que deseja excluir este laudo permanentemente?")) {
            await LaudoDB.deleteLaudo(id);
            if (currentEditingLaudoId === id) {
                currentEditingLaudoId = null;
            }
            showToast("Laudo removido com sucesso.", 'info');
            renderLaudosRepository();
        }
    };

    // ----------------------------------------------------
    // User Management (Admin Only)
    // ----------------------------------------------------
    async function renderUsersManagement() {
        const tbody = document.getElementById('users-table-body');
        const coordSelect = document.getElementById('user-input-coord');
        if (!tbody) return;

        const users = await LaudoDB.getUsers();

        // Populate Coordinators select box
        if (coordSelect) {
            const coords = users.filter(u => u.role === 'coordenador');
            coordSelect.innerHTML = '<option value="">Nenhum (Independente)</option>' +
                coords.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }

        tbody.innerHTML = users.map(u => {
            let roleClass = 'badge-role-consultor';
            let roleLabel = 'Consultor';
            if (u.role === 'admin') {
                roleClass = 'badge-role-admin';
                roleLabel = 'Admin Principal';
            } else if (u.role === 'coordenador') {
                roleClass = 'badge-role-coordenador';
                roleLabel = 'Coordenador';
            }

            let coordName = '-';
            if (u.coordinatorId) {
                const c = users.find(x => x.id === u.coordinatorId);
                if (c) coordName = c.name;
            }

            return `
                <tr>
                    <td><strong>${u.name}</strong></td>
                    <td>${u.email}</td>
                    <td><span class="user-role-badge ${roleClass}">${roleLabel}</span></td>
                    <td>${coordName}</td>
                    <td style="text-align: right;">
                        <div class="table-actions" style="justify-content: flex-end;">
                            <button type="button" class="btn-sm-action btn-view" onclick="editUserFromTable('${u.id}')" title="Editar">
                                <i class="fa-solid fa-pen"></i> Editar
                            </button>
                            ${u.role !== 'admin' ? `
                                <button type="button" class="btn-sm-action btn-del" onclick="deleteUserFromTable('${u.id}')" title="Excluir">
                                    <i class="fa-solid fa-trash"></i> Excluir
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.editUserFromTable = async function(id) {
        const users = await LaudoDB.getUsers();
        const found = users.find(u => u.id === id);
        if (!found) return;

        document.getElementById('user-form-title').textContent = 'Editar Usuário';
        document.getElementById('user-edit-id').value = found.id;
        document.getElementById('user-input-name').value = found.name;
        document.getElementById('user-input-email').value = found.email;
        document.getElementById('user-input-pass').value = found.password;
        document.getElementById('user-input-role').value = found.role;
        document.getElementById('user-input-coord').value = found.coordinatorId || '';

        toggleGroupCoordSelect();
        document.getElementById('form-user-edit').classList.remove('hidden');
    };

    window.deleteUserFromTable = async function(id) {
        if (confirm("Tem certeza que deseja excluir este usuário?")) {
            await LaudoDB.deleteUser(id);
            showToast("Usuário removido com sucesso.", 'info');
            renderUsersManagement();
        }
    };

    const formUserEdit = document.getElementById('form-user-edit');
    const roleSelect = document.getElementById('user-input-role');

    function toggleGroupCoordSelect() {
        const group = document.getElementById('group-coord-select');
        if (group && roleSelect) {
            group.style.display = (roleSelect.value === 'consultor') ? 'block' : 'none';
        }
    }

    if (roleSelect) {
        roleSelect.addEventListener('change', toggleGroupCoordSelect);
    }

    document.getElementById('btn-show-add-user')?.addEventListener('click', () => {
        document.getElementById('user-form-title').textContent = 'Cadastrar Novo Usuário';
        document.getElementById('user-edit-id').value = '';
        document.getElementById('user-input-name').value = '';
        document.getElementById('user-input-email').value = '';
        document.getElementById('user-input-pass').value = '123';
        document.getElementById('user-input-role').value = 'consultor';
        document.getElementById('user-input-coord').value = '';
        toggleGroupCoordSelect();
        document.getElementById('form-user-edit').classList.remove('hidden');
    });

    document.getElementById('btn-cancel-user')?.addEventListener('click', () => {
        document.getElementById('form-user-edit').classList.add('hidden');
    });

    if (formUserEdit) {
        formUserEdit.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('user-edit-id').value;
            const name = document.getElementById('user-input-name').value;
            const email = document.getElementById('user-input-email').value;
            const pass = document.getElementById('user-input-pass').value;
            const role = document.getElementById('user-input-role').value;
            const coordId = document.getElementById('user-input-coord').value || null;

            const newUser = {
                id: editId || ('usr_' + Date.now()),
                name,
                email,
                password: pass,
                role,
                coordinatorId: role === 'consultor' ? coordId : null
            };

            await LaudoDB.saveUser(newUser);
            document.getElementById('form-user-edit').classList.add('hidden');
            showToast(`Usuário ${name} salvo com sucesso!`, 'success');
            renderUsersManagement();
        });
    }

    // ----------------------------------------------------
    // Team View (Coordinator Only)
    // ----------------------------------------------------
    async function renderTeamView() {
        const tbody = document.getElementById('team-table-body');
        if (!tbody) return;

        const currentUser = AuthManager.getCurrentUser();
        if (!currentUser || currentUser.role !== 'coordenador') return;

        const allUsers = await LaudoDB.getUsers();
        const team = allUsers.filter(u => u.role === 'consultor' && u.coordinatorId === currentUser.id);
        const laudos = await LaudoDB.getLaudos();

        if (team.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">
                        Nenhum consultor vinculado a sua coordenação até o momento.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = team.map(c => {
            const count = laudos.filter(l => l.authorId === c.id).length;
            return `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.email}</td>
                    <td style="text-align: center;"><strong>${count}</strong> laudos</td>
                    <td style="text-align: right;">
                        <button type="button" class="btn-sm-action btn-view" onclick="openConsultantLaudos('${c.id}')">
                            <i class="fa-solid fa-folder-open"></i> Ver Laudos
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.openConsultantLaudos = function(consultantId) {
        closeModal('modal-equipe');
        openModal('modal-laudos');
        renderLaudosRepository();
        setTimeout(() => {
            const authorSelect = document.getElementById('filter-author');
            if (authorSelect) {
                authorSelect.value = consultantId;
                authorSelect.dispatchEvent(new Event('change'));
            }
        }, 200);
    };

    // ----------------------------------------------------
    // Toast Notification System
    // ----------------------------------------------------
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-circle-xmark';
        if (type === 'info') icon = 'fa-circle-info';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // Initialize Application Auth & Session State
    loadFromLocalStorage();
    renderUserSessionBar();
    updateZoom();
});
