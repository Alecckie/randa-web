import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Button, TextInput, Select, Badge, Card, Group, Text, ActionIcon, Menu } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { EyeIcon, FilterIcon, MoreVerticalIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon, MapPinIcon } from 'lucide-react';
import CreateCoverageAreaModal from '@/Components/coverage-areas/CoverageAreaModal';

// Types
interface County {
    id: number;
    name: string;
}

interface SubCounty {
    id: number;
    name: string;
    county_id: number;
}

interface Ward {
    id: number;
    name: string;
    sub_county_id: number;
}

interface CoverageArea {
    id: number;
    name: string;
    area_code: string;
    county_id: number | null;
    sub_county_id: number | null;
    ward_id: number | null;
    county?: County;
    subCounty?: SubCounty;
    ward?: Ward;
    full_name: string;
    location_path: string;
    campaigns_count?: number;
    active_campaigns_count?: number;
    created_at: string;
    updated_at: string;
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    from: number;
    to: number;
    total: number;
    last_page: number;
    per_page: number;
}

interface CoverageAreasIndexProps {
    coverageAreas: PaginatedData<CoverageArea>;
    stats: {
        total_coverage_areas: number;
        by_county: number;
        by_sub_county: number;
        by_ward: number;
    };
    filters: {
        search?: string;
        county_id?: number;
        sub_county_id?: number;
        ward_id?: number;
    };
    counties: County[];
    subCounties: SubCounty[];
    wards: Ward[];
}

export default function Index({ coverageAreas, stats, filters, counties, subCounties, wards }: CoverageAreasIndexProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [countyFilter, setCountyFilter] = useState(filters.county_id?.toString() || '');
    const [subCountyFilter, setSubCountyFilter] = useState(filters.sub_county_id?.toString() || '');
    const [wardFilter, setWardFilter] = useState(filters.ward_id?.toString() || '');

    // Create Modal State
    const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (searchTerm) params.set('search', searchTerm);
        if (countyFilter) params.set('county_id', countyFilter);
        if (subCountyFilter) params.set('sub_county_id', subCountyFilter);
        if (wardFilter) params.set('ward_id', wardFilter);

        router.get(route('coverage-areas.index', Object.fromEntries(params)));
    };

    const clearFilters = () => {
        setSearchTerm('');
        setCountyFilter('');
        setSubCountyFilter('');
        setWardFilter('');
        router.get(route('coverage-areas.index'));
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this coverage area?')) {
            router.delete(route('coverage-areas.destroy', id));
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                            Coverage Areas Management
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Manage coverage areas for campaigns
                        </p>
                    </div>
                    <Button
                        onClick={openCreateModal}
                        leftSection={<PlusIcon size={16} />}
                        size="sm"
                    >
                        New Coverage Area
                    </Button>
                </div>
            }
        >
            <Head title="Coverage Areas" />

            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-white">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">Total Coverage Areas</Text>
                                <Text size="xl" fw={700}>{stats.total_coverage_areas}</Text>
                            </div>
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <MapPinIcon size={20} className="text-gray-500" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-white">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">By County</Text>
                                <Text size="xl" fw={700}>{stats.by_county}</Text>
                            </div>
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <MapPinIcon size={20} className="text-gray-500" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-white">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">By Sub-County</Text>
                                <Text size="xl" fw={700}>{stats.by_sub_county}</Text>
                            </div>
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <MapPinIcon size={20} className="text-gray-500" />
                            </div>
                        </Group>
                    </Card>

                    <Card className="bg-white">
                        <Group>
                            <div className="flex-1">
                                <Text size="sm" c="dimmed">By Ward</Text>
                                <Text size="xl" fw={700}>{stats.by_ward}</Text>
                            </div>
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <MapPinIcon size={20} className="text-gray-500" />
                            </div>
                        </Group>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="bg-white">
                    <form onSubmit={handleSearch}>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                            <TextInput
                                placeholder="Search areas..."
                                leftSection={<SearchIcon size={16} />}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.currentTarget.value)}
                            />

                            <Select
                                placeholder="Filter by county"
                                data={[
                                    { value: '', label: 'All Counties' },
                                    ...counties.map(c => ({ value: c.id.toString(), label: c.name }))
                                ]}
                                value={countyFilter}
                                onChange={(value) => setCountyFilter(value || '')}
                                searchable
                                clearable
                            />

                            <Select
                                placeholder="Filter by sub-county"
                                data={[
                                    { value: '', label: 'All Sub-Counties' },
                                    ...subCounties.map(sc => ({ value: sc.id.toString(), label: sc.name }))
                                ]}
                                value={subCountyFilter}
                                onChange={(value) => setSubCountyFilter(value || '')}
                                searchable
                                clearable
                            />

                            <Select
                                placeholder="Filter by ward"
                                data={[
                                    { value: '', label: 'All Wards' },
                                    ...wards.map(w => ({ value: w.id.toString(), label: w.name }))
                                ]}
                                value={wardFilter}
                                onChange={(value) => setWardFilter(value || '')}
                                searchable
                                clearable
                            />

                            <Group>
                                <Button type="submit" leftSection={<FilterIcon size={16} />}>
                                    Filter
                                </Button>
                                <Button variant="light" onClick={clearFilters}>
                                    Clear
                                </Button>
                            </Group>
                        </div>
                    </form>
                </Card>

                {/* Coverage Areas Table */}
                <Card className="bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Area Code
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Location Path
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        County
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sub-County
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ward
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Campaigns
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {coverageAreas.data.map((area) => (
                                    <tr key={area.id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {area.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge variant="light" color="gray">
                                                {area.area_code}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {area.location_path}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {area.county?.name || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {area.subCounty?.name || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {area.ward?.name || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <Badge variant="outline" color="gray">
                                                {area.campaigns_count || 0} campaigns
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Menu shadow="md" width={200}>
                                                <Menu.Target>
                                                    <ActionIcon variant="subtle">
                                                        <MoreVerticalIcon size={16} />
                                                    </ActionIcon>
                                                </Menu.Target>

                                                <Menu.Dropdown>
                                                    <Menu.Item
                                                        leftSection={<EyeIcon size={14} />}
                                                        onClick={() => router.get(route('coverage-areas.show', area.id))}
                                                    >
                                                        View Details
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        leftSection={<PencilIcon size={14} />}
                                                        onClick={() => router.get(route('coverage-areas.edit', area.id))}
                                                    >
                                                        Edit
                                                    </Menu.Item>
                                                    <Menu.Divider />
                                                    <Menu.Item
                                                        color="red"
                                                        leftSection={<Trash2Icon size={14} />}
                                                        onClick={() => handleDelete(area.id)}
                                                    >
                                                        Delete
                                                    </Menu.Item>
                                                </Menu.Dropdown>
                                            </Menu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {coverageAreas.data.length === 0 && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <MapPinIcon size={32} className="text-gray-300" />
                            </div>
                            <Text size="lg" c="dimmed">No Coverage Areas found</Text>
                            <Text size="sm" c="dimmed">
                                {Object.keys(filters).some(key => filters[key as keyof typeof filters])
                                    ? "Try adjusting your filters"
                                    : "Get started by creating a new coverage area"}
                            </Text>
                        </div>
                    )}

                    {/* Pagination */}
                    {coverageAreas.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
                            <div className="text-sm text-gray-500">
                                Showing {coverageAreas.from} to {coverageAreas.to} of {coverageAreas.total} coverage areas
                            </div>
                            <div className="flex space-x-1">
                                {Array.from({ length: coverageAreas.last_page }, (_, i) => i + 1).map((page) => (
                                    <Button
                                        key={page}
                                        variant={page === coverageAreas.current_page ? "filled" : "subtle"}
                                        size="sm"
                                        onClick={() => router.get(route('coverage-areas.index', { ...filters, page }))}
                                    >
                                        {page}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Create Modal */}
            <CreateCoverageAreaModal
                opened={createModalOpened}
                onClose={closeCreateModal}
                counties={counties}
                subCounties={subCounties}
                wards={wards}
            />
        </AuthenticatedLayout>
    );
}
