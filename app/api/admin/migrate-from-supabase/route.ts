import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  try {
    // Get the data from the request
    const data = await request.json()

    // Check if we have users to migrate
    if (data.users && Array.isArray(data.users)) {
      console.log(`[MIGRATION] Migrating ${data.users.length} users...`)

      // Migrate users
      for (const user of data.users) {
        try {
          await prisma.user.upsert({
            where: { id: user.id },
            update: {
              email: user.email,
              name: user.name,
              image: user.image,
              tier: user.tier || "free",
              updatedAt: new Date(user.updatedAt || Date.now()),
            },
            create: {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              tier: user.tier || "free",
              createdAt: new Date(user.createdAt || Date.now()),
              updatedAt: new Date(user.updatedAt || Date.now()),
            },
          })
          console.log(`[MIGRATION] Migrated user ${user.id}`)
        } catch (error) {
          console.error(`[MIGRATION] Error migrating user ${user.id}:`, error)
        }
      }
    }

    // Check if we have analytics to migrate
    if (data.analytics && Array.isArray(data.analytics)) {
      console.log(`[MIGRATION] Migrating ${data.analytics.length} analytics records...`)

      // Migrate analytics in batches to avoid timeouts
      const batchSize = 100
      for (let i = 0; i < data.analytics.length; i += batchSize) {
        const batch = data.analytics.slice(i, i + batchSize)
        try {
          // Create analytics records
          await Promise.all(
            batch.map(async (record: any) => {
              try {
                await prisma.analytics.create({
                  data: {
                    id: record.id,
                    userId: record.userId,
                    provider: record.provider,
                    model: record.model || "unknown",
                    tokens: record.tokens || 0,
                    cost: record.cost || 0,
                    createdAt: new Date(record.createdAt || Date.now()),
                  },
                })
              } catch (error) {
                console.error(`[MIGRATION] Error migrating analytics record ${record.id}:`, error)
              }
            }),
          )
          console.log(`[MIGRATION] Migrated analytics batch ${i / batchSize + 1}`)
        } catch (error) {
          console.error(`[MIGRATION] Error migrating analytics batch ${i / batchSize + 1}:`, error)
        }
      }
    }

    // Check if we have chats to migrate
    if (data.chats && Array.isArray(data.chats)) {
      console.log(`[MIGRATION] Migrating ${data.chats.length} chats...`)

      // Migrate chats
      for (const chat of data.chats) {
        try {
          // Create chat
          await prisma.chat.upsert({
            where: { id: chat.id },
            update: {
              title: chat.title,
              userId: chat.userId,
              updatedAt: new Date(chat.updatedAt || Date.now()),
            },
            create: {
              id: chat.id,
              title: chat.title,
              userId: chat.userId,
              createdAt: new Date(chat.createdAt || Date.now()),
              updatedAt: new Date(chat.updatedAt || Date.now()),
            },
          })

          // Create messages for this chat
          if (chat.messages && Array.isArray(chat.messages)) {
            for (const message of chat.messages) {
              await prisma.message.create({
                data: {
                  id: message.id,
                  role: message.role,
                  content: message.content,
                  chatId: chat.id,
                  createdAt: new Date(message.createdAt || Date.now()),
                },
              })

              // Create images for this message
              if (message.images && Array.isArray(message.images)) {
                for (const image of message.images) {
                  await prisma.image.create({
                    data: {
                      id: image.id,
                      url: image.url,
                      messageId: message.id,
                      createdAt: new Date(image.createdAt || Date.now()),
                    },
                  })
                }
              }
            }
          }

          console.log(`[MIGRATION] Migrated chat ${chat.id}`)
        } catch (error) {
          console.error(`[MIGRATION] Error migrating chat ${chat.id}:`, error)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[MIGRATION] Error migrating data:", error)
    return NextResponse.json({ error: "Failed to migrate data" }, { status: 500 })
  }
}
