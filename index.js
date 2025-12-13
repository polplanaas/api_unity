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
// GET /novapartida → incrementa i retorna número de partida
// --------------------------------------
app.get("/novapartida", async (req, res) => {
  try {

    // 1️⃣ Agafar número actual
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

    // 2️⃣ Actualitzar número
    const { error: errorUpdate } = await supabase
      .from("CodiPartida")
      .update({ numero: nouNumero })
      .eq("numero", numeroActual)

    if (errorUpdate) {
      console.error(errorUpdate)
      return res.status(500).json({ error: errorUpdate.message })
    }

    // 3️⃣ Retornar número nou
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
// POST /jugadors → afegir un jugador
// --------------------------------------
app.post('/jugadors', async (req, res) => {
  try {
    const jugador = req.body

    const { data, error } = await supabase
      .from('Jugadors')
      .insert(jugador)
      .select('*')
      .single()

    if (error) {
      console.error("SUPABASE ERROR:", error)
      return res.status(400).json({ error: error.message })
    }

    console.log("Nou jugador:", data)

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
// PUT /jugadors/:id → modificar claus
// --------------------------------------
app.put('/jugadors/:id', async (req, res) => {
  const { numeroClaus } = req.body

  try {
    const { data, error } = await supabase
      .from('Jugadors')
      .update({ numeroClaus })
      .eq('idGrup', req.params.id)
      .select('*')
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Jugador no trobat" })
    }

    res.json(data)
  } catch (e) {
    res.status(500).json({ error: "Error intern servidor" })
  }
})


// --------------------------------------
// DELETE /jugadors/antics → elimina jugadors sense connexió 24h
// --------------------------------------
app.delete('/jugadors/antics', async (req, res) => {
  try {
    const fa24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('Jugadors')
      .delete()
      .lt('darreraConnexio', fa24h)
      .select()

    if (error) return res.status(400).json({ error: error.message })

    return res.status(200).json({ eliminats: data.length })
  } catch (e) {
    return res.status(500).json({ error: "Error intern servidor" })
  }
})


// --------------------------------------
// INICI SERVIDOR
// --------------------------------------
app.listen(3000, () => {
  console.log("API funcionant al port 3000")
})