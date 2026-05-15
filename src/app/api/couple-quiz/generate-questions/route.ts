import { NextResponse } from 'next/server'
import { CoupleQuizQuestion, fallbackQuizQuestions } from '../../../../lib/gameEngine'
import { createAdminClient, getUserContext, jsonError } from '../../../../lib/aiServerUtils'

const QUESTION_CATEGORIES = [
  'gu màu sắc và đồ dùng',
  'chó mèo, thú cưng, động vật thích hơn',
  'đồ ăn, đồ uống, món hay gọi',
  'ở nhà hay ra ngoài, nơi muốn đi',
  'nhạc, phim, game, mạng xã hội',
  'thói quen sáng tối và lúc rảnh',
  'cách nhắn tin, gọi điện, phản ứng khi bận',
  'tính cách nhỏ: nóng tính, lười, kỹ tính, dễ mềm lòng',
  'gu ăn mặc, mùi hương, đồ cá nhân',
  'những thứ hơi khó chịu nhưng rất đời thường'
]

const QUESTION_EXAMPLES = [
  'Giữa màu xanh và màu đỏ, bạn nghĩ người ấy dễ chọn màu nào cho một món đồ dùng hằng ngày?',
  'Người ấy nghiêng về chó hay mèo hơn, và lý do thật nhất là gì?',
  'Nếu tối nay chỉ được gọi một món quen, người ấy sẽ chọn món nào đầu tiên?',
  'Khi có 30 phút rảnh ở nhà, người ấy thường nằm lướt điện thoại, dọn dẹp, hay bật gì đó xem?',
  'Người ấy dễ khó chịu vì tin nhắn cụt ngủn, chờ trả lời lâu, hay bị hỏi dồn?',
  'Nếu đi cafe, người ấy thích góc yên tĩnh, chỗ có view đẹp, hay nơi đồ uống ngon là đủ?',
  'Khi mệt, người ấy muốn được để yên một lúc, được ôm, hay được rủ đi ăn gì đó?',
  'Trong một ngày bình thường, thói quen nhỏ nào của người ấy dễ bị bạn nhận ra nhất?'
]

export async function POST(req: Request) {
  try {
    const { coupleId } = await getUserContext(req)
    const body = await req.json().catch(() => ({}))
    if (body.coupleId && body.coupleId !== coupleId) {
      return jsonError('Bạn không có quyền tạo câu hỏi cho couple này.', 403, 'wrong_couple')
    }

    const count = clampNumber(Number(body.count || 5), 3, 8)
    const explicitExcludes = Array.isArray(body.excludeQuestions) ? body.excludeQuestions.map(String) : []
    const admin = createAdminClient()
    const { data: customRows, error: customError } = await admin
      .from('couple_quiz_custom_questions')
      .select('id, text')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })

    if (customError) throw customError

    const { data: playedRows, error: playedError } = await admin
      .from('couple_quiz_played_questions')
      .select('text, normalized_text')
      .eq('couple_id', coupleId)

    if (playedError) throw playedError

    const excludes = [
      ...explicitExcludes,
      ...(playedRows || []).map((row: any) => String(row.text || ''))
    ]
    const targetCustomCount = Math.min(Math.floor(count * 0.4), Math.max(0, count - 1))
    const customQuestions = selectUniqueQuestions(
      (customRows || []).map((row: any) => ({
        id: String(row.id),
        text: String(row.text || ''),
        source: 'custom' as const
      })),
      excludes,
      targetCustomCount
    )

    const aiTargetCount = count - customQuestions.length
    const aiQuestions = await generateAiQuestions(coupleId, excludes.concat(customQuestions.map((q) => q.text)), aiTargetCount)
    let questions = selectUniqueQuestions([...customQuestions, ...aiQuestions], excludes, count)

    if (questions.length < count) {
      questions = selectUniqueQuestions([...questions, ...fallbackQuizQuestions], excludes, count)
    }

    if (questions.length < count) {
      questions = selectUniqueQuestions(
        [...questions, ...buildEmergencyQuestions(coupleId, count * 2)],
        excludes,
        count
      )
    }

    if (!questions.length) {
      return jsonError('Chưa tìm được câu hỏi đủ mới cho hai bạn.', 409, 'not_enough_unique_questions')
    }

    const playedPayload = questions.map((question) => ({
      couple_id: coupleId,
      text: question.text,
      normalized_text: normalizeQuestion(question.text)
    }))

    const { error: insertError } = await admin.from('couple_quiz_played_questions').insert(playedPayload)
    if (insertError) throw insertError

    return NextResponse.json({ ok: true, questions })
  } catch (err) {
    const message = (err as Error).message
    if (message === 'missing_auth' || message === 'invalid_auth') return jsonError('Bạn cần đăng nhập lại.', 401, 'unauthorized')
    if (message === 'missing_couple') return jsonError('Bạn cần ghép đôi trước.', 400, 'missing_couple')
    if (message === 'missing_service_role') return jsonError('Server chưa cấu hình quyền tạo câu hỏi.', 500, 'server_config')
    return jsonError('Không thể tạo câu hỏi lúc này.', 500)
  }
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.floor(value)))
}

async function generateAiQuestions(coupleId: string, excludes: string[], count: number): Promise<CoupleQuizQuestion[]> {
  if (count <= 0 || !process.env.OPENAI_API_KEY) return []

  const prompt = [
    `Tạo ${Math.max(count * 4, 18)} câu hỏi tiếng Việt cho game "Quiz Hiểu Nhau" của một cặp đôi lâu dài.`,
    'Vai trò: viết như một người thật đang nghĩ câu hỏi để đoán gu, thói quen và tính cách của người yêu. Không viết như AI coach, không sáo rỗng, không văn chữa lành.',
    'Tỉ lệ mong muốn: 45% câu chọn giữa 2-3 lựa chọn rất cụ thể, 35% câu đoán thói quen đời thường, 20% câu cảm xúc nhưng phải gắn với tình huống cụ thể.',
    `Phải rải đều nhiều nhóm, không chỉ tình yêu: ${QUESTION_CATEGORIES.join(', ')}.`,
    'Được hỏi kiểu "A hay B", "A, B hay C", "nghiêng về cái nào hơn". Tránh câu chỉ trả lời có/không.',
    'Câu hỏi nên giống lời nói ngoài đời: ngắn, rõ, có chi tiết nhỏ, không triết lý, không dùng cụm "ngôn ngữ tình yêu", "chữa lành", "kết nối sâu sắc", "phiên bản tốt hơn".',
    'Tránh hoàn toàn: trauma, sex, politics, religion, tiền bạc/nợ, family conflict, câu quá riêng tư hoặc gây áp lực.',
    'Mỗi câu 14-150 ký tự, có dấu hỏi, đủ cụ thể để người chơi đoán được bằng 1-2 câu.',
    `Ví dụ chất lượng mong muốn: ${JSON.stringify(QUESTION_EXAMPLES)}.`,
    'Chỉ trả về JSON array string, không markdown.',
    `Không lặp hoặc gần nghĩa với các câu sau: ${JSON.stringify(excludes.slice(-120))}.`
  ].join('\n')

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.85,
        messages: [
          { role: 'system', content: 'Bạn viết câu hỏi tiếng Việt tự nhiên, đời thường, có lựa chọn cụ thể cho couple app. Trả về JSON hợp lệ.' },
          { role: 'user', content: prompt }
        ]
      })
    })

    if (!response.ok) break
    const json = await response.json().catch(() => null)
    const content = json?.choices?.[0]?.message?.content
    const parsed = parseJsonArray(content)
    const questions = parsed
      .map((text, index) => ({
        id: `ai-${Date.now()}-${attempt}-${index}`,
        text,
        source: 'ai' as const
      }))
      .filter((question) => isAllowedQuestion(question.text))

    const unique = selectUniqueQuestions(questions, excludes, count)
    if (unique.length >= count) return unique
  }

  return []
}

function parseJsonArray(value: unknown): string[] {
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    const match = value.match(/\[[\s\S]*\]/)
    if (!match) return []
    try {
      const parsed = JSON.parse(match[0])
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
}

function selectUniqueQuestions(questions: CoupleQuizQuestion[], excludes: string[], count: number) {
  const selected: CoupleQuizQuestion[] = []
  const blockers = excludes.map(normalizeQuestion).filter(Boolean)

  for (const question of questions) {
    const text = question.text.trim()
    if (!isAllowedQuestion(text)) continue
    const normalized = normalizeQuestion(text)
    const tooSimilar = blockers.some((item) => semanticSimilarity(item, normalized) > 0.85)
      || selected.some((item) => semanticSimilarity(normalizeQuestion(item.text), normalized) > 0.85)
    if (tooSimilar) continue
    selected.push({ ...question, text })
    blockers.push(normalized)
    if (selected.length >= count) break
  }

  return selected
}

function isAllowedQuestion(text: string) {
  const normalized = normalizeQuestion(text)
  if (text.length < 14 || text.length > 150) return false
  if (!text.includes('?')) return false
  const blocked = [
    'sex',
    'tình dục',
    'chính trị',
    'tôn giáo',
    'tiền bạc',
    'nợ',
    'trauma',
    'sang chấn',
    'gia đình xung đột',
    'ngôn ngữ tình yêu',
    'chữa lành',
    'phiên bản tốt hơn',
    'kết nối sâu sắc',
    'tổn thương'
  ]
  if (blocked.some((word) => normalized.includes(normalizeQuestion(word)))) return false
  const yesNoStarters = ['bạn có', 'bạn đã từng', 'bạn thích không', 'có phải', 'liệu bạn']
  return !yesNoStarters.some((starter) => normalized.startsWith(starter))
}

function normalizeQuestion(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function semanticSimilarity(a: string, b: string) {
  if (!a || !b) return 0
  if (a === b) return 1
  const aTokens = new Set(a.split(' ').filter((token) => token.length > 2))
  const bTokens = new Set(b.split(' ').filter((token) => token.length > 2))
  if (!aTokens.size || !bTokens.size) return 0
  const overlap = [...aTokens].filter((token) => bTokens.has(token)).length
  return overlap / Math.max(aTokens.size, bTokens.size)
}

function buildEmergencyQuestions(coupleId: string, count: number): CoupleQuizQuestion[] {
  const seeds = [
    'Giữa màu xanh và màu đỏ, người ấy dễ chọn màu nào cho đồ dùng hằng ngày?',
    'Người ấy nghiêng về chó hay mèo hơn, và vì sao?',
    'Nếu gọi đồ uống quen, người ấy sẽ chọn trà sữa, cà phê, nước ép hay nước lọc?',
    'Ở nhà rảnh 30 phút, người ấy sẽ nằm lướt điện thoại, dọn dẹp, hay bật gì đó xem?',
    'Khi đi ăn, người ấy thích gọi món quen hay thử món mới?',
    'Nếu phải chọn một buổi hẹn nhẹ, người ấy thích cafe yên tĩnh, đi dạo, hay ăn vặt?',
    'Người ấy dễ khó chịu vì tin nhắn cụt ngủn, chờ trả lời lâu, hay bị hỏi dồn?',
    'Khi mệt, người ấy muốn được để yên một lúc, được ôm, hay được rủ đi ăn?',
    'Trong tủ đồ, người ấy hay chọn đồ đơn giản, nổi bật, hay thoải mái là chính?',
    'Người ấy thích trời mưa ở nhà, trời nắng đi chơi, hay thời tiết nào cũng được?',
    'Nếu xem phim, người ấy nghiêng về hài, tình cảm, kinh dị, hoạt hình hay tài liệu?',
    'Món ăn vặt nào dễ làm người ấy mềm lòng nhất?',
    'Người ấy thường quyết định nhanh hay suy nghĩ rất lâu trước khi chọn?',
    'Nếu đi siêu thị, người ấy dễ mua thêm món gì ngoài dự định?',
    'Người ấy thích được khen về ngoại hình, tính cách, hay việc mình làm tốt?',
    'Khi giận nhẹ, người ấy hay im lặng, nói thẳng, hay làm như không có gì?',
    'Buổi sáng của người ấy giống kiểu dậy là tỉnh ngay hay cần rất lâu để khởi động?',
    'Nếu được chọn một mùi hương, người ấy hợp mùi sạch nhẹ, ngọt, gỗ, hay hoa?'
  ]
  return Array.from({ length: count }, (_, index) => {
    const text = seeds[index % seeds.length]
    return {
      id: `fallback-${coupleId}-${Date.now()}-${index}`,
      text,
      source: 'fallback' as const
    }
  })
}
