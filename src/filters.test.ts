import { expect, it } from 'vitest'
import { filtersFromParams, filtersToParams } from './filters'

it('los filtros van y vuelven de la URL sin perder nada', () => {
  const filters = { project_id: 3, status: 'todo', priority: 'high', tag: 'cv', overdue: true, q: 'pitch', sort: 'priority', page: 2 } as const
  expect(filtersFromParams(filtersToParams(filters))).toEqual(filters)
})

it('ignora valores no válidos en la URL', () => {
  const params = new URLSearchParams('project=abc&status=raro&priority=urgente&sort=x&page=-1&overdue=quizas')
  expect(filtersFromParams(params)).toEqual({})
})
