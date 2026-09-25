const kilometres = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 })

export const formatKm = (km: number) => `${kilometres.format(km)} km`
