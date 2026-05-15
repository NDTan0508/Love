import { beforeEach, describe, expect, it } from 'vitest'
import {
  __getLocalMissionBadgesForTests,
  __resetLocalMissionsForTests,
  completeMission,
  createMission,
  getMissionsForCurrentUser,
  updateMissionProgress
} from './missionsService'

describe('missionsService', () => {
  beforeEach(() => {
    __resetLocalMissionsForTests()
  })

  it('lists local fallback missions', async () => {
    const missions = await getMissionsForCurrentUser()
    expect(missions.length).toBeGreaterThan(0)
    expect(missions[0].title).toBeTruthy()
  })

  it('creates a mission in local fallback mode', async () => {
    const created = await createMission({
      title: 'Cung nhau di bo 20 phut',
      description: 'Nhe nhang va de deu.',
      xpReward: 20,
      badgeKey: 'walk-together'
    })

    expect(created.id).toBeTruthy()
    expect(created.title).toBe('Cung nhau di bo 20 phut')

    const missions = await getMissionsForCurrentUser()
    expect(missions.some((mission) => mission.id === created.id)).toBe(true)
  })

  it('updates mission progress', async () => {
    const missions = await getMissionsForCurrentUser()
    const target = missions[0]

    const progress = await updateMissionProgress({
      missionId: target.id,
      status: 'in_progress',
      progressValue: 1
    })

    expect(progress.status).toBe('in_progress')
    expect(progress.progressValue).toBe(1)

    const refreshed = await getMissionsForCurrentUser()
    const withProgress = refreshed.find((mission) => mission.id === target.id)
    expect(withProgress?.progress?.status).toBe('in_progress')
  })

  it('completes mission and creates badge once', async () => {
    const created = await createMission({
      title: 'Viet 1 bai journal chung',
      badgeKey: 'journal-day'
    })

    const completed = await completeMission(created.id)
    expect(completed.status).toBe('completed')
    expect(completed.completedAt).toBeTruthy()

    const badgesAfterFirstComplete = __getLocalMissionBadgesForTests()
    expect(badgesAfterFirstComplete.length).toBe(1)
    expect(badgesAfterFirstComplete[0].badgeKey).toBe('journal-day')

    await completeMission(created.id)
    const badgesAfterSecondComplete = __getLocalMissionBadgesForTests()
    expect(badgesAfterSecondComplete.length).toBe(1)
  })
})
