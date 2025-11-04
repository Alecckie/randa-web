import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Modal, Stack, TextInput, Select, Button, Group } from '@mantine/core';

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

interface CreateCoverageAreaModalProps {
    opened: boolean;
    onClose: () => void;
    counties: County[];
    subCounties: SubCounty[];
    wards: Ward[];
}

export default function CreateCoverageAreaModal({
    opened,
    onClose,
    counties,
    subCounties,
    wards
}: CreateCoverageAreaModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        county_id: '',
        sub_county_id: '',
        ward_id: '',
    });
    const [filteredSubCounties, setFilteredSubCounties] = useState<SubCounty[]>([]);
    const [filteredWards, setFilteredWards] = useState<Ward[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCountyChange = (value: string | null) => {
        setFormData({ ...formData, county_id: value || '', sub_county_id: '', ward_id: '' });
        if (value) {
            const filtered = subCounties.filter(sc => sc.county_id === parseInt(value));
            setFilteredSubCounties(filtered);
        } else {
            setFilteredSubCounties([]);
        }
        setFilteredWards([]);
    };

    const handleSubCountyChange = (value: string | null) => {
        setFormData({ ...formData, sub_county_id: value || '', ward_id: '' });
        if (value) {
            const filtered = wards.filter(w => w.sub_county_id === parseInt(value));
            setFilteredWards(filtered);
        } else {
            setFilteredWards([]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post(route('coverage-areas.store'), formData, {
            onSuccess: () => {
                onClose();
                setFormData({ name: '', county_id: '', sub_county_id: '', ward_id: '' });
                setFilteredSubCounties([]);
                setFilteredWards([]);
            },
            onFinish: () => {
                setIsSubmitting(false);
            }
        });
    };

    const handleClose = () => {
        setFormData({ name: '', county_id: '', sub_county_id: '', ward_id: '' });
        setFilteredSubCounties([]);
        setFilteredWards([]);
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title="Create New Coverage Area"
            size="lg"
            centered
        >
            <form onSubmit={handleSubmit}>
                <Stack>
                    <TextInput
                        label="Coverage Area Name"
                        placeholder="Enter coverage area name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
                        required
                    />

                    <Select
                        label="County"
                        placeholder="Select county"
                        data={counties.map(c => ({ value: c.id.toString(), label: c.name }))}
                        value={formData.county_id}
                        onChange={handleCountyChange}
                        searchable
                        required
                    />

                    <Select
                        label="Sub-County"
                        placeholder="Select sub-county"
                        data={filteredSubCounties.map(sc => ({ value: sc.id.toString(), label: sc.name }))}
                        value={formData.sub_county_id}
                        onChange={handleSubCountyChange}
                        searchable
                        disabled={!formData.county_id}
                    />

                    <Select
                        label="Ward"
                        placeholder="Select ward"
                        data={filteredWards.map(w => ({ value: w.id.toString(), label: w.name }))}
                        value={formData.ward_id}
                        onChange={(value) => setFormData({ ...formData, ward_id: value || '' })}
                        searchable
                        disabled={!formData.sub_county_id}
                    />

                    <Group justify="flex-end" mt="md">
                        <Button variant="light" onClick={handleClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={isSubmitting}>
                            Create Coverage Area
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}