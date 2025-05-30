# Rilevamento Frodi su Carte di Credito: Applicazione Full-Stack

Questo progetto implementa un sistema end-to-end per il rilevamento di frodi nelle transazioni con carte di credito. Include l'analisi dei dati, l'addestramento di modelli di Machine Learning, un backend API Flask per le predizioni e un frontend React per l'interazione utente. L'intera applicazione è orchestrata tramite Docker Compose.

## Dataset

Il dataset utilizzato è "Credit Card Fraud Detection" disponibile su Kaggle:
[https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud?resource=download](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud?resource=download)

**Nota:** Prima di procedere, scarica il file `creditcard.csv` e posizionalo nella directory `notebooks/data/` (creala se non esiste).

## Prerequisiti

* **Docker e Docker Compose** installati e in esecuzione sul tuo sistema.

## Istruzioni per l'Avvio con Docker

### 1. Preparazione degli Artefatti del Modello

Questa applicazione si basa su modelli di Machine Learning pre-addestrati. Questi modelli e i relativi file di configurazione (scaler, lista delle feature, soglie di classificazione) vengono generati eseguendo il notebook Jupyter (`notebooks/credit.ipynb`).

**Azione Richiesta (da eseguire una tantum o quando i modelli vengono riaddestrati):**

1.  **Esegui il Notebook Jupyter:**
    * Se non l'hai già fatto, configura un ambiente Python locale (es. usando `uv`):
        ```bash
        # Dalla root del progetto
        uv venv .venv-notebook-setup
        source .venv-notebook-setup/bin/activate  # o equivalente per il tuo OS
        # Installa le dipendenze necessarie per il notebook
        uv pip install pandas scipy numpy xgboost matplotlib seaborn joblib scikit-learn imbalanced-learn jupyterlab notebook
        ```
    * Avvia Jupyter Lab:
        ```bash
        jupyter lab
        ```
    * Apri ed esegui tutte le celle del notebook `notebooks/credit.ipynb`. Questo processo salverà i file `.joblib` e `.json` necessari.
2.  **Popola `backend/saved_model/`:**
    * Assicurati che tutti gli artefatti generati dal notebook (es. `LR_model.joblib`, `LR_columns.joblib`, `LR_thresh.json`, `RF-OPT_model.joblib`, `RF-OPT_columns.joblib`, `XGB_model.joblib`, `XGB_columns.joblib`, `scaler_amount.joblib`, `scaler_time.joblib`) siano stati salvati o spostati nella directory `backend/saved_model/`.
    * Il backend (`backend/app.py`) caricherà dinamicamente i modelli da questa directory basandosi sulla convenzione di denominazione:
        * Modello: `{NOME_BASE}_model.joblib`
        * Colonne: `{NOME_BASE}_columns.joblib`
        * Soglia (opzionale): `{NOME_BASE}_thresh.json` (contenente `{"thresh": valore_soglia}`)

### 2. Costruzione e Avvio dell'Applicazione Dockerizzata

Con la directory `backend/saved_model/` correttamente popolata:

1.  Dalla directory principale del progetto (dove si trova il file `docker-compose.yml`), esegui:
    ```bash
    docker compose up --build
    ```
    * L'opzione `--build` è raccomandata per la prima esecuzione o se hai modificato i `Dockerfile`. Per avvii successivi, `docker compose up` potrebbe essere sufficiente.
    * Per eseguire in background, aggiungi l'opzione `-d`.

### 3. Accesso all'Applicazione

Una volta che i container sono stati avviati con successo:

* **Frontend**: Apri il tuo browser e naviga a [http://localhost:8080](http://localhost:8080).
* **Backend**: L'API Flask sarà in esecuzione e accessibile dal frontend (tipicamente sulla porta `5001`, come configurato nel `docker-compose.yml`).

### 4. Fermare l'Applicazione

* Per fermare i container in esecuzione in primo piano, premi `Ctrl+C` nel terminale.
* Se i container sono in esecuzione in background (con l'opzione `-d`), o per pulire, esegui dalla directory principale del progetto:
    ```bash
    docker-compose down
    ```
    Per rimuovere anche i volumi anonimi, aggiungi l'opzione `-v`: `docker compose down -v`.

