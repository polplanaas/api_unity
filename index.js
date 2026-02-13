import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(cors())
app.use(express.json())

// --------------------------------------
// Connexió a Supabase
// IMPORTANT: Sempre usar SERVICE_KEY per permetre UPDATE
// --------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)


// --------------------------------------
// TEST
// --------------------------------------
app.get('/', (req, res) => {
  res.send("API funcionant!")
})


// --------------------------------------
// GET /novapartida → incrementa número i NETEJA jugadors
// --------------------------------------
app.get("/novapartida", async (req, res) => {
  try {

    // 1️⃣ Agafar el número de partida actual de la base de dades
    const { data, error: errorSelect } = await supabase
      .from("CodiPartida")
      .select("numero")
      .limit(1)
      .single()

    if (errorSelect) {
      console.error(errorSelect)
      return res.status(500).json({ error: errorSelect.message })
    }

    const numeroActual = data.numero
    const nouNumero = numeroActual + 1

    // 2️⃣ Actualitzar el número a la taula per a la propera vegada
    const { error: errorUpdate } = await supabase
      .from("CodiPartida")
      .update({ numero: nouNumero })
      .eq("numero", numeroActual)

    if (errorUpdate) {
      console.error(errorUpdate)
      return res.status(500).json({ error: errorUpdate.message })
    }

    res.json({ codiPartida: nouNumero })

  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "Error intern", detalls: e.message })
  }
})


// --------------------------------------
// GET /jugadors → obtenir tots els jugadors
// --------------------------------------
app.get('/jugadors', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Jugadors')
      .select('*')
      .order('idGrup')

    if (error) return res.status(400).json({ error: error.message })

    res.json(data)
  } catch (e) {
    res.status(500).json({ error: "Error intern servidor" })
  }
})


// --------------------------------------
// POST /jugadors → afegir un jugador amb control de partida
// --------------------------------------
app.post('/jugadors', async (req, res) => {
  try {
    const jugador = req.body

    // 1️⃣ VALIDACIÓ: El número de partida existeix/és el correcte?
    const { data: partidaData, error: partidaError } = await supabase
      .from("CodiPartida")
      .select("numero")
      .eq("numero", jugador.numeroPartida) // Busquem si el número enviat està a la taula
      .single()

    // Si hi ha error o no troba cap fila amb aquest número
    if (partidaError || !partidaData) {
      console.warn(`Intent d'entrada amb codi de partida invàlid: ${jugador.numeroPartida}`);
      return res.status(400).json({ 
        error: "El codi de partida no és vàlid o la partida no existeix." 
      });
    }

    // 2️⃣ Si el codi és correcte, procedim a fer l'INSERT
    const { data, error } = await supabase
      .from('Jugadors')
      .insert(jugador)
      .select('*')
      .single()

    if (error) {
      console.error("SUPABASE ERROR:", error)
      return res.status(400).json({ error: error.message })
    }

    console.log("Nou jugador validat i afegit:", data)

    return res.status(201).json({
      idGrup: data.idGrup,
      nomGrup: data.nomGrup,
      numeroClaus: data.numeroClaus,
      numeroPartida: data.numeroPartida
    })

  } catch (e) {
    console.error("ERROR SERVIDOR:", e)
    return res.status(500).json({ error: "Error intern servidor" })
  }
})


// --------------------------------------
// PUT /jugadors/:idGrup → actualitzar claus i guanyador
// --------------------------------------
app.put('/jugadors/:idGrup', async (req, res) => {
  // Extraiem els camps del body
  const { numeroClaus, guanyador } = req.body
  const idGrup = req.params.idGrup

  try {
    const { data, error } = await supabase
      .from('Jugadors')
      .update({ 
        numeroClaus: numeroClaus, 
        guanyador: guanyador 
      })
      .eq('idGrup', idGrup)
      .select()

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: "Jugador no trobat" })
    }

    // Retornem el missatge tal com demana la teva documentació
    res.json({ message: "Jugador actualitzat correctament!" })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "Error intern servidor" })
  }
})

// --------------------------------------
// DELETE /jugadors/antics → elimina jugadors antics
// --------------------------------------
app.delete('/jugadors/antics', async (req, res) => {
  try {
    // Si ve una data al body la fem servir, si no, fem servir la data d'avui
    const dataLimit = req.body.data || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('Jugadors')
      .delete()
      .lte('dataPartida', dataLimit  + 'T23:59:59') //Fico aixi perque quant crei la partida s'eliminin tots els registras anteriors
      .select()

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Retornem la resposta exactament com demana la documentació
    return res.status(200).json({
      message: "Jugadors antics eliminats correctament.",
      dataLimit: dataLimit,
      eliminats: data ? data.length : 0
    });

  } catch (e) {
    console.error("ERROR SERVIDOR:", e);
    return res.status(500).json({ error: "Error intern servidor" });
  }
});


// --------------------------------------
// INICI SERVIDOR
// --------------------------------------
app.listen(3000, () => {
  console.log("API funcionant al port 3000")
})