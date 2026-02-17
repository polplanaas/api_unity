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

    // 1️⃣ Obtenir l'última partida creada
    const { data: ultimaPartida, error: partidaError } = await supabase
      .from("CodiPartida")
      .select("numero")
      .order("numero", { ascending: false })
      .limit(1)
      .single()

    if (partidaError) {
      return res.status(500).json({ error: "Error comprovant partida" })
    }

    // 2️⃣ Validar que no sigui més gran que l'última
    if (jugador.numeroPartida > ultimaPartida.numero) {
      return res.status(400).json({
        error: "El número de partida és superior a l'última partida creada."
      });
    }

    // 3️⃣ Inserim jugador
    const { data, error } = await supabase
      .from('Jugadors')
      .insert(jugador)
      .select('*')
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

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

    const dataBase = req.body?.data || new Date().toLocaleDateString('sv-SE');
    const dataLimit = dataBase + 'T00:00:00';

    const { data, error } = await supabase
      .from('Jugadors')
      .delete()
      .lt('dataPartida', dataLimit)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

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